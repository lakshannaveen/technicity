import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      // Scroll the window
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch (e) { }

    try {
      // Also reset any scrollable dashboard/main containers
      const els = document.querySelectorAll('.dashboard-main, main, .dashboard-container');
      els.forEach((el) => { if (el && typeof el.scrollTo === 'function') el.scrollTo(0, 0); else if (el) el.scrollTop = 0; });
    } catch (e) { }
  }, [pathname]);

  return null;
};

export default ScrollToTop;