// Helpers to merge imported backup data into the current vault
// - Creates missing folders by name
// - Maps imported folder IDs to current IDs by name
// - Deduplicates entries by title (case-insensitive, trimmed)
// - Adds new entries in bulk

/**
 * Merge a parsed backup payload into the current vault.
 * Contract:
 *  - data: { folders?: {id: string, n: string}[], entries: {t,u,p,ts,fid}[] }
 *  - deps: { items, folders, addFolder(name): Promise<string>, addItemsBulk(list): Promise<void> }
 * Returns: { added: number, skipped: number, currentFolders: Array, folderMapping: Map }
 */
export async function mergeBackupData(data, { items, folders, addFolder, addItemsBulk }) {

    if (!data || !Array.isArray(data.entries)) throw new Error('Invalid backup');

    // Build folder mapping based on folder names
    const folderMap = new Map(); // importedFolderId -> currentFolderId
    
    // keep a ref that always has latest folders
    // const foldersRef = useRef(folders);
    // useEffect(() => { foldersRef.current = folders; }, [folders]);
    // const getFolders = () => foldersRef.current;
        
    console.log("🔍 Starting folder mapping...");
    console.log("Backup folders:", (data.folders || []).map(f => f.n).join(", "));
    console.log("Current folders:", folders.map(f => f.name).join(", "));

    // Create a working set of folders that we'll update as we create new ones
    const currentFolders = [...folders];
    const folderNameToId = new Map(currentFolders.map(f => [f.name, f.id]));


    // Process each backup folder sequentially to avoid race conditions
    for (const backupFolder of (data.folders || [])) {
        // Always check existence in currentFolders, not the original folders array
        const existingId = folderNameToId.get(backupFolder.n);
        console.log(`🔍 Processing folder: ${backupFolder.n} (id: ${backupFolder.id})`);
        if (existingId) {
            // Folder already exists, just map it
            console.log("📂 Mapping existing folder:", backupFolder.n, "->", existingId);
            folderMap.set(backupFolder.id, existingId);
        } else {
            // Folder doesn't exist, create it
            const newId = await addFolder(backupFolder.n);
            folderMap.set(backupFolder.id, newId);
            // Update our working map so subsequent iterations can see this new folder
            currentFolders.push({ id: newId, name: backupFolder.n });
            folderNameToId.set(backupFolder.n, newId);
            // Small delay to allow React state to settle and persist to complete
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    //await new Promise(resolve => setTimeout(resolve, 100)); // Wait for React state to update    
    console.log("📁 Final folder mapping:", Array.from(folderMap.entries()));
    
    // Deduplicate by title only
    const existingTitles = new Set(items.map(i => i.title.toLowerCase().trim()));
    const toAdd = [];
    
    for (const e of data.entries) {
        const titleKey = String(e.t || '').toLowerCase().trim();
        if (!titleKey) continue;
        if (existingTitles.has(titleKey)) continue;
        
        const mappedFolderId = e.fid != null ? (folderMap.get(e.fid) ?? null) : null;
        console.log(`📄 Adding entry "${e.t}" to folder:`, mappedFolderId);
        
        toAdd.push({
            title: e.t,
            username: e.u,
            password: e.p,
            lastChangedAt: e.ts,
            folderId: mappedFolderId,
        });
    }

    if (toAdd.length) await addItemsBulk(toAdd, currentFolders);
    console.log(`✅ Import complete: ${toAdd.length} added, ${data.entries.length - toAdd.length} skipped`);
    
    // Return results 
    return { 
        added: toAdd.length, 
        skipped: data.entries.length - toAdd.length,
        currentFolders,
        folderMapping: folderMap
    };
}

export default { mergeBackupData };
