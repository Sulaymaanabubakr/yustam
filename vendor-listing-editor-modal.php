<div id="listingEditor" class="listing-editor" hidden>
    <div class="listing-editor__overlay" data-editor-dismiss aria-hidden="true"></div>
    <div class="listing-editor__dialog" role="dialog" aria-modal="true" aria-labelledby="listingEditorTitle">
        <form id="listingEditorForm" class="listing-editor__form">
            <header class="listing-editor__header">
                <h2 id="listingEditorTitle">Edit listing</h2>
                <button type="button" class="listing-editor__close" data-editor-dismiss aria-label="Close editor">
                    <i class="ri-close-line"></i>
                </button>
            </header>
            <p class="listing-editor__status" data-editor-status role="status" aria-live="polite"></p>
            <input type="hidden" name="listingId">
            <div class="listing-editor__field">
                <label for="listingEditorTitleInput">Title</label>
                <input id="listingEditorTitleInput" type="text" name="title" maxlength="140" required placeholder="E.g. Samsung 55'' Smart TV">
            </div>
            <div class="listing-editor__grid">
                <div class="listing-editor__field">
                    <label for="listingEditorPriceInput">Price (₦)</label>
                    <input id="listingEditorPriceInput" type="number" step="0.01" min="0" name="price" inputmode="decimal" placeholder="0.00">
                </div>
                <div class="listing-editor__field">
                    <label for="listingEditorStatusSelect">Status</label>
                    <select id="listingEditorStatusSelect" name="status"></select>
                </div>
            </div>
            <div class="listing-editor__field">
                <label for="listingEditorDescription">Description</label>
                <textarea id="listingEditorDescription" name="description" rows="4" maxlength="1200" placeholder="Describe the product, condition, delivery options..."></textarea>
            </div>
            <div class="listing-editor__preview" data-editor-preview-container hidden>
                <span class="listing-editor__preview-label">Preview</span>
                <img src="" alt="Listing preview image" data-editor-preview>
            </div>
            <div class="listing-editor__actions">
                <button type="button" class="listing-editor__secondary" data-editor-dismiss>Cancel</button>
                <button type="submit" class="listing-editor__submit">
                    <span class="listing-editor__submit-label">Save changes</span>
                    <span class="listing-editor__spinner" aria-hidden="true"></span>
                </button>
            </div>
        </form>
    </div>
</div>
