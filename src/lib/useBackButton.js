import { useEffect, useRef } from 'react';

/* Makes the browser / Android hardware back button dismiss in-app layers
   (the add-task panel, task detail, settings, command menu, focus timer, the
   mobile drawer) and step back from "secondary" views to the last main page —
   instead of leaving the site.

   `layers` is an ordered array (topmost first) of { active, close }, rebuilt on
   every render. Only the *number* of active layers drives the browser history
   depth: each active layer corresponds to one synthetic history entry, so one
   back press pops exactly one layer. When a layer is instead dismissed from the
   UI, we consume its synthetic entry with history.go() (suppressing the
   resulting popstate) to keep the two stacks in sync. */
export default function useBackButton(layers) {
  const latest = useRef(layers);
  latest.current = layers;
  const pushed = useRef(0);
  const suppress = useRef(0);

  const activeCount = layers.reduce((n, l) => n + (l.active ? 1 : 0), 0);

  useEffect(() => {
    if (activeCount > pushed.current) {
      for (let i = pushed.current; i < activeCount; i += 1) window.history.pushState({ punctualLayer: i + 1 }, '');
      pushed.current = activeCount;
    } else if (activeCount < pushed.current) {
      const diff = pushed.current - activeCount;
      pushed.current = activeCount;
      suppress.current += diff;
      window.history.go(-diff);
    }
  }, [activeCount]);

  useEffect(() => {
    const onPop = () => {
      if (suppress.current > 0) { suppress.current -= 1; return; }
      pushed.current = Math.max(0, pushed.current - 1);
      const top = latest.current.find((l) => l.active);
      if (top) top.close();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
