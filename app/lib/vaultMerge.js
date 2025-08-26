// ...existing code...
/**
 * vaultMerge.js
 *
 * Provides logic for merging imported backup data into the current vault.
 * Handles folder mapping, deduplication, and bulk item addition.
 * Ensures all folders have unique IDs and correct mapping by original folder ID.
 * Includes logging for merge events, folder creation, and errors.
 */

/**
 * mergeBackupData
 *
 * Merges backup data into the current vault, creating new folders and mapping items as needed.
 * Ensures all folders have unique IDs and entries are assigned to correct folders using original folder IDs.
 * Logs merge events, folder mapping, and errors.
 * @param {object} data - Decrypted backup payload
 * @param {object} context - { items, folders, addFolder, addItemsBulk }
 * @returns {object} - { added, skipped, currentFolders, folderMapping }
 */
export async function mergeBackupData(data, { items, folders, addFolder, addItemsBulk }) {
  try {
    const folderIdMap = new Map();
    let currentFolders = [...folders];
    let added = 0, skipped = 0;

    // Helper to generate a unique folder ID
    const generateUniqueFolderId = (name) => {
      return `f_${Date.now()}_${Math.floor(Math.random() * 100000)}_${name.replace(/[^a-zA-Z0-9]/g, '')}`;
    };

    // Map old folder IDs to new unique IDs, create new folders if needed
    for (const f of data.folders || []) {
      let existing = currentFolders.find(cf => cf.name === f.name);
      let newId;
      if (!existing) {
        newId = generateUniqueFolderId(f.name);
        await addFolder(f.name); // addFolder should also generate a unique id, but we ensure it here
        currentFolders.push({ id: newId, name: f.name });
        //console.log(`[VaultMerge] Created new folder: ${f.name} (id: ${newId})`);
      } else {
        newId = existing.id;
      }
      folderIdMap.set(f.id, newId);
    }

    // Prepare items for import, map folderId using folderIdMap
    const newItems = [];
    for (let idx = 0; idx < (data.items || []).length; idx++) {
      const e = data.items[idx];
      //console.log(`[VaultMerge] Importing item #${idx}:`, e);
      const exists = items.some(i => i.title === e.title && i.username === e.username);
      if (exists) {
        //console.log(`[VaultMerge] Skipped duplicate item: ${e.title} (${e.username})`);
        skipped++;
        continue;
      }
      // Log folderId mapping
      let mappedFolderId = e.folderId ? folderIdMap.get(e.folderId) : null;
      console.log(`[VaultMerge] Item folderId:`, e.folderId, 'Mapped to:', mappedFolderId);
      newItems.push({
        title: e.title,
        username: e.username,
        password: e.password,
        lastChangedAt: e.lastChangedAt,
        folderId: mappedFolderId,
      });
      added++;
    }

    // Bulk add new items
    await addItemsBulk(newItems, currentFolders);
    console.log(`[VaultMerge] Merge completed: ${added} added, ${skipped} skipped`);
    return { added, skipped, currentFolders, folderMapping: folderIdMap };
  } catch (e) {
    console.error('[VaultMerge] Merge failed:', e);
    throw e;
  }
}

export default { mergeBackupData };
