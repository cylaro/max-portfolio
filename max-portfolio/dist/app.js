import { startScene } from "./scene.js";
import { translations, projects } from "./content.js";
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(pointer: fine)");
let lang = "en";
try {
  lang = localStorage.getItem("max-language") === "ru" ? "ru" : "en";
} catch {}
let paused = reduced.matches;
const t = (key) => translations[lang][key] ?? translations.en[key] ?? key;
let activeProject = null,
  savedBrief = null,
  demoState = null;
function applyLanguage(next, save = true) {
  lang = next === "ru" ? "ru" : "en";
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  $$("[data-i18n-placeholder]").forEach(
    (el) => (el.placeholder = t(el.dataset.i18nPlaceholder)),
  );
  $$("[data-i18n-aria]").forEach((el) =>
    el.setAttribute("aria-label", t(el.dataset.i18nAria)),
  );
  $$("[data-language]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.language === lang)),
  );
  document.title = t("pageTitle");
  $("meta[name=description]").content = t("pageDescription");
  $("#hero-title").setAttribute("aria-label", t("heroAria"));
  updateMotionButton();
  updateMenuLabel();
  if (activeProject) renderProject(activeProject);
  if (savedBrief) makeMessage();
  if (save) {
    try {
      localStorage.setItem("max-language", lang);
    } catch {}
  }
}
$$("[data-language]").forEach((b) =>
  b.addEventListener("click", () => applyLanguage(b.dataset.language)),
);
const menu = $("#mobile-nav"),
  menuToggle = $(".menu-toggle");
function updateMenuLabel() {
  menuToggle.setAttribute(
    "aria-label",
    t(menu.hidden ? "openMenu" : "closeMenu"),
  );
}
function closeMenu() {
  menu.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  updateMenuLabel();
}
menuToggle.addEventListener("click", () => {
  menu.hidden = !menu.hidden;
  menuToggle.setAttribute("aria-expanded", String(!menu.hidden));
  updateMenuLabel();
});
$$("a", menu).forEach((a) => a.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
matchMedia("(min-width: 761px)").addEventListener("change", (e) => {
  if (e.matches) closeMenu();
});
$("#year").textContent = new Date().getFullYear();
const scene = startScene($("#sculpture"), () => paused);
function updateMotionButton() {
  const b = $(".motion-toggle");
  b.setAttribute("aria-pressed", String(paused));
  b.setAttribute("aria-label", t(paused ? "resume" : "pause"));
}
function setMotion(value) {
  paused = value;
  document.body.classList.toggle("motion-paused", paused);
  updateMotionButton();
  scene.refresh();
}
$(".motion-toggle").addEventListener("click", () => setMotion(!paused));
reduced.addEventListener("change", (e) => setMotion(e.matches));
const projectDialog = $("#project-dialog"),
  briefDialog = $("#brief-dialog");
let focusBeforeDialog;
function openDialog(dialog, origin = document.activeElement) {
  focusBeforeDialog = origin;
  closeMenu();
  dialog.showModal();
  document.body.classList.add("dialog-open");
}
$$("dialog").forEach((dialog) => {
  $(".dialog-close", dialog).addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    const r = dialog.getBoundingClientRect();
    if (
      e.target === dialog &&
      (e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom)
    )
      dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (dialog === projectDialog) activeProject = null;
    if (!$$("dialog").some((d) => d.open)) {
      document.body.classList.remove("dialog-open");
      focusBeforeDialog?.focus();
    }
  });
});
function openBrief(type, origin) {
  if (projectDialog.open) projectDialog.close();
  if (type) {
    const radio = $(`input[name=type][value=${type}]`);
    if (radio) radio.checked = true;
  }
  openDialog(briefDialog, origin);
}
$$("[data-brief]").forEach((b) =>
  b.addEventListener("click", () => openBrief(b.dataset.type, b)),
);
function renderProject(key) {
  const p = projects[lang][key];
  $("#project-detail").innerHTML =
    `<span class="dialog-label">${t("concept")} / ${p.category}</span><h2 id="project-title">${p.title}</h2><p class="detail-description">${p.description}</p>${key === "flow" ? '<div class="demo-chat"><div class="demo-messages" aria-live="polite"></div><div class="demo-controls"></div></div>' : ""}<h3 class="detail-heading">${t("insideProject")}</h3><ul class="detail-features">${p.features.map((f) => `<li>${f}</li>`).join("")}</ul><div class="detail-tech">${p.tech.map((f) => `<span>${f}</span>`).join("")}</div><button class="pill-link" id="similar-project"><span>${t("similarProject")}</span><span aria-hidden="true">↗</span></button><p class="detail-concept">${t("detailConcept")}</p>`;
  $("#similar-project").addEventListener("click", () => openBrief(p.type));
  if (key === "flow") initDemo();
}
$$("[data-project]").forEach((b) =>
  b.addEventListener("click", () => {
    activeProject = b.dataset.project;
    demoState = null;
    renderProject(activeProject);
    openDialog(projectDialog, b);
  }),
);
let demoAbort;
function initDemo() {
  demoState ??= {
    step: 0,
    day: null,
    history: [{ key: "demoHello", own: false }],
    options: [
      ["book", "demoBook"],
      ["features", "demoFeatures"],
      ["reset", "demoReset"],
    ],
  };
  const messages = $(".demo-messages"),
    controls = $(".demo-controls");
  function paint() {
    messages.replaceChildren();
    demoState.history.forEach((item) => {
      const node = document.createElement("div");
      node.className = "demo-message" + (item.own ? " own" : "");
      node.textContent = t(item.key)
        .replace("{time}", item.time || "")
        .replace("{day}", t(item.day || "friday"));
      messages.append(node);
    });
    controls.replaceChildren();
    demoState.options.forEach(([action, label]) => {
      const b = document.createElement("button");
      b.dataset.demo = action;
      b.textContent = t(label);
      controls.append(b);
    });
    messages.scrollTop = messages.scrollHeight;
  }
  demoAbort?.abort();
  demoAbort = new AbortController();
  controls.addEventListener(
    "click",
    (e) => {
      const button = e.target.closest("[data-demo]");
      if (!button) return;
      const action = button.dataset.demo;
      if (action === "reset") {
        demoState = null;
        initDemo();
        return;
      }
      const option = demoState.options.find(([value]) => value === action);
      demoState.history.push({ key: option[1], own: true });
      if (action === "features") {
        demoState.history.push({ key: "demoAbout" });
        demoState.options = [
          ["book", "demoBook"],
          ["reset", "demoReset"],
        ];
      } else if (action === "book") {
        demoState.step = 1;
        demoState.history.push({ key: "demoDay" });
        demoState.options = [
          ["friday", "friday"],
          ["saturday", "saturday"],
        ];
      } else if (demoState.step === 1) {
        demoState.day = action;
        demoState.step = 2;
        demoState.history.push({ key: "demoTime" });
        demoState.options = [
          ["14:00", "timeTwo"],
          ["16:30", "timeFour"],
        ];
      } else if (demoState.step === 2) {
        demoState.step = 3;
        demoState.history.push({
          key: "demoDone",
          time: action,
          day: demoState.day,
        });
        demoState.options = [["reset", "demoReset"]];
      }
      paint();
    },
    { signal: demoAbort.signal },
  );
  paint();
}
const form = $("#brief-form");
function makeMessage() {
  if (!savedBrief) return;
  const type = t(
    savedBrief.type === "website"
      ? "website"
      : savedBrief.type === "bot"
        ? "telegramBot"
        : "both",
  );
  $("#brief-message").value =
    `${t("messageHello")}\n\n${t("messageType")}: ${type}\n\n${savedBrief.idea}\n\n${t("messageContact")}: ${savedBrief.contact}`;
  $(".telegram-send").href =
    `https://t.me/cylaro?text=${encodeURIComponent($("#brief-message").value)}`;
}
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const idea = $("#brief-idea"),
    contact = $("#brief-contact");
  idea.setCustomValidity(idea.value.trim() ? "" : t("emptyIdea"));
  contact.setCustomValidity(contact.value.trim() ? "" : t("emptyContact"));
  if (!form.reportValidity()) return;
  savedBrief = {
    type: new FormData(form).get("type"),
    idea: idea.value.trim(),
    contact: contact.value.trim(),
  };
  makeMessage();
  form.hidden = true;
  $("#brief-result").hidden = false;
  $(".copy-status").textContent = "";
  $("#copy-brief").focus();
});
$$("input, textarea", form).forEach((el) =>
  el.addEventListener("input", () => el.setCustomValidity("")),
);
$(".brief-reset").addEventListener("click", () => {
  form.hidden = false;
  $("#brief-result").hidden = true;
  $("#brief-idea").focus();
});
$("#copy-brief").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#brief-message").value);
    $(".copy-status").textContent = t("copied");
  } catch {
    $("#brief-message").focus();
    $("#brief-message").select();
    $(".copy-status").textContent = t("copyFallback");
  }
});
applyLanguage(lang, false);
setMotion(paused);
document.documentElement.classList.add("js");
const revealObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }),
  { threshold: 0.12, rootMargin: "0px 0px -20px 0px" },
);
$$(".reveal,.reveal-heading").forEach((el) => revealObserver.observe(el));
let scrollFrame = 0;
function syncScroll() {
  scrollFrame = 0;
  const y = window.scrollY,
    distance = document.documentElement.scrollHeight - innerHeight;
  $(".scroll-progress").style.transform =
    `scaleX(${distance > 0 ? y / distance : 0})`;
  if (!paused) {
    $(".hero").style.setProperty("--scene-scroll", `${Math.min(y, 1000)}px`);
    $("#contact").style.setProperty(
      "--contact-scroll",
      `${$("#contact").getBoundingClientRect().top}px`,
    );
  }
}
addEventListener(
  "scroll",
  () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(syncScroll);
  },
  { passive: true },
);
addEventListener("resize", syncScroll);
syncScroll();
const cursor = $(".cursor-label");
$$(".project").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    if (paused || !finePointer.matches) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty(
      "--rx",
      `${(-(e.clientY - r.top - r.height / 2) / r.height) * 5}deg`,
    );
    card.style.setProperty(
      "--ry",
      `${((e.clientX - r.left - r.width / 2) / r.width) * 5}deg`,
    );
    cursor.textContent = t("view");
    cursor.style.transform = `translate(${e.clientX - 37}px,${e.clientY - 37}px) scale(1)`;
    cursor.classList.add("visible");
  });
  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    cursor.classList.remove("visible");
  });
});
$$(".magnetic").forEach((button) => {
  button.addEventListener("pointermove", (e) => {
    if (paused || !finePointer.matches) return;
    const r = button.getBoundingClientRect();
    button.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.12}px,${(e.clientY - r.top - r.height / 2) * 0.15}px)`;
  });
  button.addEventListener("pointerleave", () => (button.style.transform = ""));
});
