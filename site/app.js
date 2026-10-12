/* Walkersville Lions boys soccer 2026 — renders index.html and photos.html from window.DATA (built by scripts/build.py). */
(() => {
  const D = window.DATA;
  const S = D.schedule;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const day = iso => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = (() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); })();
  const fmtDate = (iso, long) => { const d = day(iso); return `${(long ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] : DOW)[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`; };
  const LEVELS = ["varsity", "jv"];
  const LABEL = { varsity: "Varsity", jv: "JV" };
  const firstTime = g => g.time.jv || g.time.varsity;  // JV kicks off first
  const timesText = g => g.time.jv && g.time.varsity ? `JV ${esc(g.time.jv)} · Varsity ${esc(g.time.varsity)}`
    : firstTime(g) ? esc(firstTime(g)) : "Time TBA";
  const kickoff = g => {
    const d = day(g.date);
    const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(firstTime(g) || "");
    if (m) d.setHours((+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0), +m[2]);
    return d;
  };
  const opp = g => S.opponents[g.opp] || {};
  const venue = g => g.home ? S.homeVenue : `${g.opp} High School, ${opp(g).city || ""}`;
  const mapUrl = g => "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(g.home ? "Walkersville High School, 81 W Frederick St, Walkersville, MD" : `${g.opp} High School, ${opp(g).city}, MD`);
  const vsAt = g => g.home ? "vs" : "at";
  const result = (g, level) => g[level];
  const isPast = g => day(g.date) < today || g.varsity || g.jv;
  const ticketUrl = g => g.tickets || (g.home ? S.links.tickets : null);

  const photos = D.photos;
  const gameKey = p => p.date ? p.date : "x-" + p.opp.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const gameOn = date => date && S.games.find(x => x.date === date);
  const photosFor = (date, level) => photos.filter(p => p.date === date && (!level || p.level === level));
  const sortPhotos = list => [...list].sort((a, b) => (b.featured - a.featured));
  const playerByNum = (level, n) => (D.roster[level] || []).find(p => p.num === n);
  const who = p => p.numbers.map(n => { const pl = playerByNum(p.level, n); return pl ? `#${n} ${esc(pl.name)}` : `#${n}`; }).join(" · ");

  const ICON = {
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3z"/><path d="M13 4v16" stroke-dasharray="2 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  };

  const resHtml = (r, past, short) => r
    ? `<span class="res ${r.res}"><i>${r.res}</i>${r.gf}–${r.ga}</span>`
    : `<span class="res none">${past ? (short ? "No score" : "Score not reported") : ""}</span>`;

  function record(level) {
    const rs = S.games.filter(g => !g.scrimmage).map(g => g[level]).filter(Boolean);
    const c = k => rs.filter(r => r.res === k).length;
    let streak = 0, kind = null;
    for (const r of [...rs].reverse()) { if (!kind) kind = r.res; if (r.res !== kind) break; streak++; }
    return { w: c("W"), l: c("L"), t: c("T"), gf: rs.reduce((s, r) => s + r.gf, 0), ga: rs.reduce((s, r) => s + r.ga, 0), n: rs.length, streak, kind };
  }
  const recStr = r => `${r.w}-${r.l}${r.t ? "-" + r.t : ""}`;

  /* ---------- shared: header links + lightbox ---------- */
  document.querySelectorAll("#nav-tickets").forEach(a => a.href = S.links.tickets);

  const lb = $("#lb");
  let lbList = [], lbIdx = 0;
  function openLb(list, idx) {
    lbList = list; lbIdx = idx;
    lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    drawLb();
  }
  function closeLb() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  function drawLb() {
    const p = lbList[lbIdx];
    const g = gameOn(p.date);
    const who = p.numbers.map(n => { const pl = playerByNum(p.level, n); return pl ? `#${n} ${pl.name}` : `#${n}`; }).join(", ");
    lb.innerHTML = `
      <div class="lb-top">
        <div><div class="t">${p.level === "jv" ? "JV" : "Varsity"} · ${g ? `${vsAt(g)} ${esc(p.opp)}` : esc(p.opp)}</div>
          <div class="s">${p.date ? fmtDate(p.date) : "2026 season"}${p.caption ? " · " + esc(p.caption) : ""}</div></div>
        <span class="sp"></span>
        <a href="${p.full}" download>Download</a>
        <button data-close aria-label="Close">✕</button>
      </div>
      <div class="lb-stage">
        <button class="lb-nav prev" data-step="-1" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
        <img src="${p.full}" alt="">
        <button class="lb-nav next" data-step="1" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button>
      </div>
      <div class="lb-bot">${lbIdx + 1} / ${lbList.length}${who ? ` · In this photo: ${who.split(", ").map(w => `<a href="photos.html#num=${w.match(/\d+/)[0]}&level=${p.level}">${esc(w)}</a>`).join(" ")}` : ""}
        · <a href="${p.drive}" target="_blank" rel="noopener">Original in Drive</a></div>`;
    [lbIdx - 1, lbIdx + 1].forEach(i => { const q = lbList[(i + lbList.length) % lbList.length]; if (q) new Image().src = q.full; });
  }
  const step = n => { lbIdx = (lbIdx + n + lbList.length) % lbList.length; drawLb(); };
  lb.addEventListener("click", e => {
    if (e.target.closest("[data-close]") || e.target.classList.contains("lb-stage")) closeLb();
    const s = e.target.closest("[data-step]"); if (s) step(+s.dataset.step);
  });
  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  let touchX = null;
  lb.addEventListener("touchstart", e => touchX = e.touches[0].clientX, { passive: true });
  lb.addEventListener("touchend", e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    touchX = null;
  });

  /* ---------- home ---------- */
  function home() {
    const feat = photos.filter(p => p.featured && p.level === "varsity");
    const hero = feat[Math.floor(Math.random() * feat.length)];
    if (hero) $("#hero-bg").style.backgroundImage = `url(${hero.full})`;

    const v = record("varsity"), jv = record("jv");
    const tile = (r, label) => `<div class="record"><span>${label}</span><b>${r.n ? recStr(r) : "0-0"}</b>
      <small>${r.kind === "W" && r.streak > 1 ? `${r.streak}-game win streak` : `${r.gf}–${r.ga} goals`}</small></div>`;
    $("#records").innerHTML = tile(v, "Varsity") + tile(jv, "JV");

    // next game
    const upcoming = S.games.filter(g => !isPast(g));
    const next = upcoming[0];
    const box = $("#next-game");
    if (!next) {
      box.innerHTML = `<div class="label"><span>Regular season</span></div><h2>Season complete</h2>
        <p class="where">Playoff games will be posted by MPSSAA. Thanks for cheering on the Lions!</p>`;
    } else {
      const t = ticketUrl(next);
      box.innerHTML = `
        <div class="label"><span>Next game</span><span class="pill ${next.home ? "" : "away"}">${next.home ? "Home" : "Away"}</span></div>
        <h2>${vsAt(next)} ${esc(next.opp)}<small>${esc(opp(next).mascot || "")}${next.note ? " · " + esc(next.note) : ""}</small></h2>
        <div class="when">${fmtDate(next.date, true)} · ${timesText(next)}</div>
        <div class="where"><a href="${mapUrl(next)}" target="_blank" rel="noopener">${esc(venue(next))}</a></div>
        <div class="countdown" id="cd"></div>
        <div class="actions">
          ${t ? `<a class="btn gold" href="${t}" target="_blank" rel="noopener">${ICON.ticket}Buy tickets</a>` : ""}
          <a class="btn ghost" href="${mapUrl(next)}" target="_blank" rel="noopener">${ICON.pin}Directions</a>
          <a class="btn ghost" href="${S.links.watch}" target="_blank" rel="noopener">▶ Watch</a>
        </div>
        ${upcoming[1] ? `<div class="also">After that: <b>${fmtDate(upcoming[1].date)} ${vsAt(upcoming[1])} ${esc(upcoming[1].opp)}</b>${firstTime(upcoming[1]) ? " · " + esc(firstTime(upcoming[1])) : ""}</div>` : ""}`;
      const cd = $("#cd");
      const tick = () => {
        const ms = Math.max(0, kickoff(next) - new Date());
        const parts = [[Math.floor(ms / 864e5), "days"], [Math.floor(ms / 36e5) % 24, "hrs"], [Math.floor(ms / 6e4) % 60, "min"], [Math.floor(ms / 1e3) % 60, "sec"]];
        cd.innerHTML = parts.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("");
      };
      tick(); setInterval(tick, 1000);
    }

    // latest result + photos
    const played = S.games.filter(g => (g.varsity || g.jv) && !g.scrimmage);
    const last = played[played.length - 1];
    if (last) {
      const lv = LEVELS.filter(l => last[l]);
      const wins = lv.filter(l => last[l].res === "W");
      const headline = wins.length === 2 ? `Lions sweep ${esc(last.opp)}`
        : wins.length === 1 ? `${LABEL[wins[0]]} wins ${vsAt(last)} ${esc(last.opp)}`
        : lv.every(l => last[l].res === "T") ? `Draw ${vsAt(last)} ${esc(last.opp)}` : `Tough night ${vsAt(last)} ${esc(last.opp)}`;
      const pics = sortPhotos(photosFor(last.date));
      const shown = pics.slice(0, 5);
      $("#highlight").innerHTML = `
        <div class="score-card">
          <div class="eyebrow">${fmtDate(last.date, true)} · ${last.home ? "Home" : "Away"}</div>
          <h3 class="headline">${headline}</h3>
          <div class="duo">${LEVELS.map(l => last[l] ? `
            <div class="lvl"><span>${LABEL[l]}</span><b>${last[l].gf}<em>–</em>${last[l].ga}</b><i class="${last[l].res}">${{ W: "Win", L: "Loss", T: "Tie" }[last[l].res]}</i></div>`
            : `<div class="lvl none"><span>${LABEL[l]}</span><b>—</b><i>${last.canceled[l] ? "Canceled" : "No score"}</i></div>`).join("")}
          </div>
          ${LEVELS.some(l => last.watch && last.watch[l]) ? `<div class="replays">${LEVELS.filter(l => last.watch[l]).map(l =>
            `<a href="${last.watch[l]}" target="_blank" rel="noopener">▶ Watch ${LABEL[l]} replay</a>`).join("")}</div>` : ""}
          <div class="meta">${esc(venue(last))}<br>${pics.length} photo${pics.length === 1 ? "" : "s"} from this game</div>
        </div>
        <div class="mosaic">${shown.map((p, i) => `
          <button data-i="${i}" aria-label="Open photo"><img src="${i ? p.thumb : p.full}" alt="" loading="lazy">
          ${i === shown.length - 1 && pics.length > shown.length ? `<span class="more">+${pics.length - shown.length + 1} more</span>` : ""}</button>`).join("")}
        </div>`;
      $("#highlight .mosaic").addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.querySelector(".more")) location.href = `photos.html#game=${last.date}`;
        else openLb(pics, +b.dataset.i);
      });
      $("#recent").innerHTML = played.slice(0, -1).reverse().slice(0, 4).map(g => {
        const cover = sortPhotos(photosFor(g.date, "varsity"))[0] || photosFor(g.date)[0];
        return `<a class="mini" href="photos.html#game=${g.date}">
          <div class="ph" style="${cover ? `background-image:url(${cover.thumb})` : ""}"></div>
          <div class="body"><div class="opp">${vsAt(g)} ${esc(g.opp)}</div><div class="date">${fmtDate(g.date)}</div>
            <div class="both">${LEVELS.map(l => `<span><small>${LABEL[l]}</small>${g[l] ? resHtml(g[l]) : `<span class="res none">—</span>`}</span>`).join("")}</div></div></a>`;
      }).join("");
    }

    // schedule + team (shared team toggle)
    const nextDate = next && next.date;
    const rec = $("#sched-sub");
    function schedule(level) {
      const r = record(level);
      rec.textContent = `${S.season} · ${S.classification}${r.n ? ` · ${level === "jv" ? "JV" : "Varsity"} ${recStr(r)}` : ""}`;
      $("#sched").innerHTML = S.games.map(g => {
        const d = day(g.date), past = isPast(g), n = photosFor(g.date, level).length, t = ticketUrl(g);
        return `<div class="game${g.date === nextDate ? " is-next" : ""}">
          <div class="d"><span>${DOW[d.getDay()]}</span><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div>
          <div><div class="opp"><span class="vs">${vsAt(g)}</span>${esc(g.opp)}</div>
            <div class="sub"><span class="pill ${g.home ? "" : "away"}">${g.home ? "Home" : "Away"}</span>
              ${g.scrimmage ? `<span class="pill scr">Scrimmage</span>` : ""}
              ${!past ? `<span>${g.time[level] ? esc(g.time[level]) : "Time TBA"}</span>` : ""}
              <a href="${mapUrl(g)}" target="_blank" rel="noopener">${esc(venue(g))}</a>
              ${g.note ? `<span>· ${esc(g.note)}</span>` : ""}</div></div>
          <div class="right">
            ${g.watch && g.watch[level] ? `<a class="photos-link watch-link" href="${g.watch[level]}" target="_blank" rel="noopener">▶ ${past ? "Replay" : "Watch live"}</a>` : "<span></span>"}
            ${n ? `<a class="photos-link" href="photos.html#game=${g.date}&level=${level}">${ICON.cam}${n} photo${n === 1 ? "" : "s"}</a>` : "<span></span>"}
            ${g.canceled[level] ? `<span class="res none">Canceled</span>` : past ? (g.scrimmage ? `<span class="res none"></span>` : resHtml(result(g, level), true, true)) : t ? `<a class="btn gold sm" href="${t}" target="_blank" rel="noopener">${ICON.ticket}Tickets</a>` : `<span class="res none">${g.home ? "" : "Away tickets at gate"}</span>`}
          </div></div>`;
      }).join("");
    }
    function team(level) {
      const cs = D.roster.coaches.filter(c => c.teams.includes(level));
      $("#coaches").innerHTML = cs.map(c => `
        <div class="coach"><div class="avatar">${c.name.split(" ").map(w => w[0]).join("")}</div>
          <div><div class="role">${esc(c.role)}${c.teams.length > 1 ? " · Varsity &amp; JV" : ""}</div><h3>${esc(c.name)}</h3>${c.bio ? `<p>${esc(c.bio)}</p>` : ""}</div></div>`).join("");
      $("#roster-title").textContent = `${level === "jv" ? "JV" : "Varsity"} Roster`;
      const players = [...(D.roster[level] || [])].sort((a, b) => a.num - b.num);
      if (players.length) {
        $("#roster").innerHTML = `<div class="roster">${players.map(p => {
          const n = photos.filter(x => x.level === level && x.numbers.includes(p.num)).length;
          return `<a class="player" href="photos.html#num=${p.num}&level=${level}"><div class="jersey">${p.num}</div>
            <div><div class="n">${esc(p.name)}</div><div class="m">${[p.grade, p.pos].filter(Boolean).map(esc).join(" · ")}${n ? ` · ${n} photo${n > 1 ? "s" : ""}` : ""}</div></div></a>`;
        }).join("")}</div>`;
      } else {
        const nums = [...new Set(photos.filter(p => p.level === level).flatMap(p => p.numbers))].sort((a, b) => a - b);
        $("#roster").innerHTML = `<div class="empty"><b>The 2026 ${level === "jv" ? "JV" : "varsity"} roster is coming soon.</b><br>
          In the meantime, find your player's photos by jersey number:
          <div class="numbers">${nums.map(n => `<a href="photos.html#num=${n}&level=${level}">${n}</a>`).join("")}</div></div>`;
      }
    }
    function setLevel(level) {
      document.querySelectorAll("[data-team-toggle] button").forEach(b => b.setAttribute("aria-pressed", b.dataset.team === level));
      schedule(level); team(level);
    }
    document.querySelectorAll("[data-team-toggle]").forEach(el => el.addEventListener("click", e => {
      const b = e.target.closest("button"); if (b) setLevel(b.dataset.team);
    }));
    setLevel("varsity");

    $("#updated").textContent = D.updated;
    $("#watch").href = S.links.watch;
      document.querySelectorAll("[data-team-toggle] button").forEach(b => b.addEventListener("click", () => $("#arbiter").href = D.roster.arbiter[b.dataset.team]));
      $("#arbiter").href = D.roster.arbiter.varsity;
    $("#ics").addEventListener("click", downloadIcs);
  }

  function downloadIcs() {
    const pad = n => String(n).padStart(2, "0");
    const stamp = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lions Soccer 2026//EN", "X-WR-CALNAME:Walkersville Lions Boys Soccer"];
    S.games.filter(g => !isPast(g)).forEach(g => {
      const d = kickoff(g);
      const when = firstTime(g)
        ? [`DTSTART;TZID=America/New_York:${stamp(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`,
           `DTEND;TZID=America/New_York:${stamp(d)}T${pad(d.getHours() + 3)}${pad(d.getMinutes())}00`]
        : [`DTSTART;VALUE=DATE:${stamp(d)}`];
      lines.push("BEGIN:VEVENT", `UID:lions-${g.date}@lionssoccer`, `DTSTAMP:${stamp(new Date())}T000000Z`, ...when,
        `SUMMARY:Lions Soccer ${vsAt(g)} ${g.opp} (JV then Varsity)`, `LOCATION:${venue(g).replace(/,/g, "\\,")}`,
        `DESCRIPTION:${(ticketUrl(g) ? "Tickets: " + ticketUrl(g) + "\\n" : "")}Watch: ${S.links.watch}`, "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
    a.download = "lions-soccer-2026.ics";
    a.click();
  }

  /* ---------- custom dropdown ----------
     dropdown(el, {placeholder, search, onChange}) -> {setGroups([{label, items:[{value,label}]}]), setValue(v)}
     Keyboard: arrows move, Enter picks, Esc closes, typing filters when search is on. */
  function dropdown(el, opts) {
    el.classList.add("dd");
    el.innerHTML = `<button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false"><span class="dd-label"></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="dd-panel" hidden>${opts.search ? `<input class="dd-search" type="text" placeholder="${esc(opts.search)}" autocomplete="off">` : ""}<div class="dd-list" role="listbox"></div></div>`;
    const btn = el.querySelector(".dd-btn"), panel = el.querySelector(".dd-panel"), list = el.querySelector(".dd-list"), search = el.querySelector(".dd-search");
    let groups = [], value = "", active = -1;
    const all = () => [{ value: "", label: opts.placeholder }, ...groups.flatMap(g => g.items)];
    const label = () => (all().find(i => i.value === value) || all()[0]).label;
    function render() {
      const q = search ? search.value.trim().toLowerCase() : "";
      const hit = i => !q || i.label.toLowerCase().includes(q);
      let k = 0;
      const row = i => `<div class="dd-opt${i.value === value ? " sel" : ""}" role="option" data-v="${esc(i.value)}" data-k="${k++}" aria-selected="${i.value === value}">${esc(i.label)}</div>`;
      list.innerHTML = (q ? "" : row({ value: "", label: opts.placeholder })) +
        groups.map(g => { const its = g.items.filter(hit); return its.length ? (g.label ? `<div class="dd-group">${esc(g.label)}</div>` : "") + its.map(row).join("") : ""; }).join("")
        || `<div class="dd-empty">No matches</div>`;
      highlight(Math.max(0, [...list.querySelectorAll(".dd-opt")].findIndex(o => o.dataset.v === value)));
    }
    function highlight(i) {
      const os = list.querySelectorAll(".dd-opt"); if (!os.length) return;
      active = (i + os.length) % os.length;
      os.forEach((o, j) => o.classList.toggle("act", j === active));
      os[active].scrollIntoView({ block: "nearest" });
    }
    const open = () => { panel.hidden = false; btn.setAttribute("aria-expanded", "true"); el.classList.add("open"); if (search) { search.value = ""; } render(); (search || btn).focus(); };
    const close = () => { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); el.classList.remove("open"); };
    const pick = v => { value = v; btn.querySelector(".dd-label").textContent = label(); el.classList.toggle("on", !!v); close(); btn.focus(); opts.onChange(v); };
    btn.addEventListener("click", () => panel.hidden ? open() : close());
    list.addEventListener("click", e => { const o = e.target.closest(".dd-opt"); if (o) pick(o.dataset.v); });
    list.addEventListener("mousemove", e => { const o = e.target.closest(".dd-opt"); if (o && +o.dataset.k !== active) highlight(+o.dataset.k); });
    if (search) search.addEventListener("input", render);
    el.addEventListener("keydown", e => {
      if (panel.hidden) { if (["ArrowDown", "Enter", " "].includes(e.key) && e.target === btn) { e.preventDefault(); open(); } return; }
      if (e.key === "Escape") { e.preventDefault(); close(); btn.focus(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
      else if (e.key === "Enter") { e.preventDefault(); const o = list.querySelectorAll(".dd-opt")[active]; if (o) pick(o.dataset.v); }
    });
    document.addEventListener("click", e => { if (!el.contains(e.target)) close(); });
    return {
      setGroups(g) { groups = g; btn.querySelector(".dd-label").textContent = label(); if (!panel.hidden) render(); },
      setValue(v) { value = v; btn.querySelector(".dd-label").textContent = label(); el.classList.toggle("on", !!v); },
    };
  }

  /* ---------- photo catalog ---------- */
  function catalog() {
    $("#drive-link").href = S.links.drive;
    const games = new Map();
    photos.forEach(p => { const k = gameKey(p); if (!games.has(k)) games.set(k, { key: k, opp: p.opp, date: p.date }); });
    const gameList = [...games.values()].sort((a, b) => (b.date || "0").localeCompare(a.date || "0"));
    const gameLabel = g => g.date ? `${MON[day(g.date).getMonth()]} ${day(g.date).getDate()} · ${vsAt(gameOn(g.date))} ${g.opp}` : g.opp;
    const gameDD = dropdown($("#game"), { placeholder: "All games", onChange: v => { state.game = v; writeHash(); draw(); } });
    gameDD.setGroups([{ items: gameList.map(g => ({ value: g.key, label: gameLabel(g) })) }]);
    const playerDD = dropdown($("#player"), { placeholder: "All players", search: "Type a name or number…", onChange: v => {
      if (!v) state.num = null;
      else { const [l, n] = v.split(":"); state.level = l; state.num = +n; }
      writeHash(); draw();
    } });
    $("#ph-sub").innerHTML = `A selection of ${photos.length} photos from ${gameList.length} games, drawn from the season's full collection.
      Tap any photo to view full size or download. <a href="${S.links.drive}" target="_blank" rel="noopener">See all photos in Google Drive →</a>
      <small class="tag-note">Player tags are matched from jersey numbers and may not always be accurate.</small>`;

    const state = { q: "", level: "", game: "", num: null };
    const readHash = () => {
      const h = new URLSearchParams(location.hash.slice(1));
      state.level = h.get("level") || ""; state.game = h.get("game") || ""; state.num = h.has("num") ? +h.get("num") : null;
      state.q = h.get("q") || "";
    };
    const writeHash = () => {
      const h = new URLSearchParams();
      if (state.game) h.set("game", state.game);
      if (state.level) h.set("level", state.level);
      if (state.num !== null) h.set("num", state.num);
      if (state.q) h.set("q", state.q);
      history.replaceState(null, "", "#" + h.toString());
    };

    const hay = p => {
      const g = gameOn(p.date);
      const names = p.numbers.map(n => playerByNum(p.level, n)?.name || "").join(" ");
      return [p.opp, p.caption, p.level === "jv" ? "jv junior varsity" : "varsity", g ? (g.home ? "home" : "away") : "", g && g.scrimmage ? "scrimmage" : "",
        p.date ? `${MON[day(p.date).getMonth()]} ${["january","february","march","april","may","june","july","august","september","october","november","december"][day(p.date).getMonth()]}` : "",
        p.numbers.map(n => `#${n}`).join(" "), names, S.opponents[p.opp]?.mascot].join(" ").toLowerCase();
    };
    const hays = new Map(photos.map(p => [p, hay(p)]));
    const matches = p => {
      if (state.level && p.level !== state.level) return false;
      if (state.game && gameKey(p) !== state.game) return false;
      if (state.num !== null && !p.numbers.includes(state.num)) return false;
      const toks = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      return toks.every(t => /^#?\d+$/.test(t) ? p.numbers.includes(+t.replace("#", "")) : hays.get(p).includes(t));
    };

    function draw() {
      document.querySelectorAll("#level button").forEach(b => b.setAttribute("aria-pressed", b.dataset.level === state.level));
      gameDD.setValue(state.game);
      // player picker: roster players who appear in at least one photo, grouped by team
      playerDD.setGroups(LEVELS.filter(l => !state.level || state.level === l).map(l => ({
        label: LABEL[l],
        items: [...(D.roster[l] || [])].filter(pl => photos.some(x => x.level === l && x.numbers.includes(pl.num)))
          .sort((a, b) => a.num - b.num).map(pl => ({ value: `${l}:${pl.num}`, label: `#${pl.num} ${pl.name}` })),
      })).filter(g => g.items.length));
      const lv = state.level || LEVELS.find(l => playerByNum(l, state.num));
      playerDD.setValue(state.num !== null ? `${lv}:${state.num}` : "");
      const active = state.level || state.game || state.num !== null || state.q;
      $("#clear").hidden = !active;

      const list = photos.filter(matches);
      $("#count").textContent = `${list.length} photo${list.length === 1 ? "" : "s"}`;
      if (!list.length) { $("#catalog").innerHTML = `<div class="noresults">No photos match these filters.<br><button class="btn ghost sm" data-clear>Show all photos</button></div>`; return; }
      const flat = [];
      $("#catalog").innerHTML = gameList.map(g => {
        const ps = sortPhotos(list.filter(p => gameKey(p) === g.key));
        if (!ps.length) return "";
        const sg = gameOn(g.date);
        const levels = [...new Set(ps.map(p => p.level))];
        const html = `<div class="group"><h2>${sg ? `${vsAt(sg)} ` : ""}${esc(g.opp)}</h2>
          <span class="meta">${g.date ? fmtDate(g.date, true) : "Non-league / preseason"}${sg && sg.scrimmage ? " · Scrimmage" : ""}${sg ? LEVELS.filter(l => sg[l]).map(l => ` · ${LABEL[l]} ${sg[l].res} ${sg[l].gf}–${sg[l].ga}`).join("") : ""} · ${ps.length} photo${ps.length === 1 ? "" : "s"}${levels.length === 1 ? ` · ${levels[0] === "jv" ? "JV" : "Varsity"}` : ""}</span></div>
          <div class="grid">${ps.map(p => {
            flat.push(p);
            return `<button data-i="${flat.length - 1}" aria-label="Open photo"><span class="ph"><img src="${p.thumb}" alt="" loading="lazy"></span>
              ${p.level === "jv" ? `<span class="tags"><span>JV</span></span>` : ""}
              <span class="cap${p.numbers.length ? "" : " empty"}" title="${p.numbers.length ? who(p).replace(/"/g, "&quot;") : ""}">${p.numbers.length ? who(p) : (p.caption ? esc(p.caption) : "&nbsp;")}</span></button>`;
          }).join("")}</div>
          <div class="drive-links">${(D.driveGames || []).filter(d => d.key === g.key && (!state.level || d.level === state.level)).map(d =>
            `<a class="btn ghost sm" href="${d.url}" target="_blank" rel="noopener">See all ${d.count} ${d.level === "jv" ? "JV" : "Varsity"} photos from this game in Google Drive →</a>`).join("")}</div>`;
        return html;
      }).join("");
      $("#catalog").onclick = e => { const b = e.target.closest("button[data-i]"); if (b) openLb(flat, +b.dataset.i); };
    }

    $("#level").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      state.level = b.dataset.level;
      if (state.level && state.num !== null && !photos.some(p => p.level === state.level && p.numbers.includes(state.num))) state.num = null;
      writeHash(); draw();
    });
    const clearAll = () => { Object.assign(state, { q: "", level: "", game: "", num: null }); $("#q").value = ""; writeHash(); draw(); };
    $("#clear").addEventListener("click", clearAll);
    $("#catalog").addEventListener("click", e => { if (e.target.closest("[data-clear]")) clearAll(); });
    let qt;
    $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim(); writeHash(); draw(); }, 150); });
    const sync = () => { readHash(); if ($("#q").value.trim() !== state.q) $("#q").value = state.q; draw(); };
    window.addEventListener("hashchange", sync);
    sync();
  }

  if (document.body.dataset.page === "home") home();
  if (document.body.dataset.page === "photos") catalog();
})();
