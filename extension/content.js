// content.js - Injected into the host page

(function() {
  if (window.self !== window.top) return; // Don't run in iframes
  if (document.getElementById('crepesalatte-extension-root')) return;

  function getExtensionUrl(path) {
    try {
      if (!chrome?.runtime?.id) return "";
      return chrome.runtime.getURL(path);
    } catch {
      return "";
    }
  }

  function removeInjectedUi() {
    root.remove();
  }

  const root = document.createElement('div');
  root.id = 'crepesalatte-extension-root';
  
  // Create FAB
  const fab = document.createElement('div');
  fab.className = 'crepesalatte-extension-fab';
  fab.title = 'Open CrepesALatte Service Studio';
  
  const iconUrl = getExtensionUrl('icons/icon48.png');
  if (!iconUrl) return;
  const img = document.createElement('img');
  img.src = iconUrl;
  img.alt = 'CrepesALatte Icon';
  fab.appendChild(img);

  // Create Sidebar Container
  const sidebar = document.createElement('div');
  sidebar.className = 'crepesalatte-extension-sidebar';
  
  // Create iframe to load popup.html in sidebar mode
  const iframe = document.createElement('iframe');
  
  function checkUrlAndUpdateIframe() {
    const popupPath = getExtensionUrl('popup.html');
    if (!popupPath) {
      removeInjectedUi();
      return;
    }

    // Ensure we only match /deals/ID and explicitly reject /deals/view/ID
    const match = window.location.pathname.match(/\/deals\/(?!view\/)(\d+)(?:\/|$)/);
    const popupUrl = new URL(popupPath);
    popupUrl.searchParams.set('sidebar', 'true');
    if (match && match[1]) {
      popupUrl.searchParams.set('dealId', match[1]);
    } else {
      popupUrl.searchParams.delete('dealId');
    }
    if (iframe.src !== popupUrl.toString()) {
      iframe.src = popupUrl.toString();
    }
  }

  // Initial load
  checkUrlAndUpdateIframe();

  // Observe URL changes for Single Page App navigations
  let lastUrl = location.href; 
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      checkUrlAndUpdateIframe();
    }
  }).observe(document, {subtree: true, childList: true});
  
  sidebar.appendChild(iframe);
  root.appendChild(fab);
  root.appendChild(sidebar);
  document.body.appendChild(root);

  // Interaction and Drag logic
  let isOpen = false;
  let isDragging = false;
  let hasMoved = false;
  let startY;
  let initialTop;

  // Load saved position
  try {
    chrome.storage.local.get(['fabTopPosition'], (result) => {
      if (chrome.runtime.lastError) return;
      if (result.fabTopPosition) {
        fab.style.top = result.fabTopPosition;
      }
    });
  } catch {
    removeInjectedUi();
    return;
  }

  function toggleSidebar() {
    isOpen = !isOpen;
    if (isOpen) {
      sidebar.classList.add('open');
      fab.classList.add('shifted');
    } else {
      sidebar.classList.remove('open');
      fab.classList.remove('shifted');
    }
  }

  fab.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault(); // Prevent default drag behavior (like text selection or image drag)
    
    startY = e.clientY;
    const computedStyle = window.getComputedStyle(fab);
    initialTop = parseFloat(computedStyle.top);
    hasMoved = false;
    isDragging = true;
    
    // Disable transition during drag for smoothness
    fab.style.transition = 'none';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    
    const deltaY = e.clientY - startY;
    
    // Only consider it a drag if moved more than 3 pixels
    if (!hasMoved && Math.abs(deltaY) > 3) {
      hasMoved = true;
    }
    
    if (hasMoved) {
      let newTop = initialTop + deltaY;
      
      // Boundary checks (button center is positioned by top due to translateY(-50%))
      // Button height is 48px, so center can go from 24px to windowHeight - 24px
      const minTop = 24;
      const maxTop = window.innerHeight - 24;
      
      if (newTop < minTop) newTop = minTop;
      if (newTop > maxTop) newTop = maxTop;
      
      fab.style.top = `${newTop}px`;
    }
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // Restore transition
    fab.style.transition = '';
    
    if (hasMoved) {
      try {
        chrome.storage.local.set({ fabTopPosition: fab.style.top });
      } catch {
        removeInjectedUi();
      }
    }
    
    // Reset hasMoved asynchronously so that the click event (which fires after mouseup) can see it
    setTimeout(() => {
      hasMoved = false;
    }, 0);
  }

  // Prevent default image dragging
  fab.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  fab.addEventListener('click', (e) => {
    // If we moved, prevent the click from toggling the sidebar
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    toggleSidebar();
  });

  // Listener for close events from iframe
  window.addEventListener('message', (event) => {
    // Basic validation
    if (event.data?.type === 'CREPESALATTE_CLOSE_SIDEBAR') {
      if (isOpen) {
        toggleSidebar();
      }
    }
  });

})();
