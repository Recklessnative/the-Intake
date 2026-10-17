// The 2041 arc (STORY.md, spoilers): small things in the office that don't add up. Act 1 is
// weeks 1 to 4 and has to work as plain 2007 office jokes. Rules: at most one new hint lands per
// in-game day, none is scored, and hard mode and Try one case never show one. A week counts only
// when its Friday is done in the normal game, so `week` here is not the same as the game's weekNo.
(function () {
  const KEY = 'intake-arc';
  // When each hint may first land: arc week and day of the week (0 = Monday). One slot per day.
  const HINTS = [
    { id: 'badge', week: 1, day: 0 },     // your desk, evening: badge No. 1207, "Photo: to follow"
    { id: 'tape', week: 1, day: 1 },      // morning: lift button 5 taped over, the building has four floors
    { id: 'floor5', week: 2, day: 0 },    // inbox: Facilities about the floor 5 button
    { id: 'planner', week: 2, day: 2 },   // Darren's planner: "NEW HIRE!!" again
    { id: 'morning', week: 3, day: 0 },   // Mieke: "Morning again!", word for word every Monday
    { id: 'rain', week: 3, day: 1 },      // morning: the rain started at 08:56, like every day
    { id: 'flicker', week: 3, day: 3 }    // end of the week: the lift indicator flickers 4, 5, 4
  ];
  const slot = (week, day) => week * 7 + day;

  function read() {
    try { return Object.assign({ shown: {} }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { shown: {} }; }
  }
  function keep(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } }

  // May this hint show now? Once it has landed it stays (a mail stays in the inbox, a planner stays
  // open). A new one lands only when it is due and nothing else landed today; otherwise it waits
  // for the next day that is free.
  function offer(id, now) {
    const h = HINTS.find(x => x.id === id);
    if (!h || !now || now.off) return false;
    const st = read();
    if (st.shown[id] != null) return true;
    const today = slot(now.week, now.day);
    if (slot(h.week, h.day) > today) return false;
    if (Object.values(st.shown).includes(today)) return false;
    st.shown[id] = today;
    keep(st);
    return true;
  }
  // For a hint that is a moment, not a thing that stays: true only the time it lands.
  function once(id, now) { return read().shown[id] == null && offer(id, now); }
  const shown = () => Object.keys(read().shown);

  window.Arc = { HINTS, offer, once, shown };
})();
