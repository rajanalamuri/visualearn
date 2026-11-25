/* Any button marked data-print opens the print dialog. */
(() => {
  'use strict';
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-print]')) window.print();
  });
})();
