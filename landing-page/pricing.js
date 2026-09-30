// The pricing section is complete markup; this script fills it in from
// window.yard.project.tiers so the page never carries a tier id or a price
// of its own. Yard injects embed.js, which may land before or after this
// file, so the script waits for it briefly rather than assuming an order.
//
// The Premium button is shown or hidden here rather than with
// data-yard-when="not_owned": someone holding the $0 Free tier counts as
// "owned", and they are exactly who should see the upgrade.
(function () {
  "use strict";

  var plans = document.getElementById("plans");
  if (!plans) return;

  var base = location.href.split(/[?#]/)[0];
  if (!/\/$/.test(base) && !/\.html?$/.test(base)) base += "/";

  var tries = 0;

  function ready() {
    return window.yard && window.yard.project && Array.isArray(window.yard.project.tiers);
  }

  function wait() {
    if (ready()) return fill(window.yard.project);
    if (tries++ < 60) return setTimeout(wait, 100);
    // No project data (embed.js blocked, say): the button stays hidden
    // rather than offer a checkout without a tier id.
  }

  function money(cents) {
    var dollars = cents / 100;
    return "$" + (Number.isInteger(dollars) ? dollars : dollars.toFixed(2));
  }

  function setText(root, selector, text) {
    var node = root.querySelector(selector);
    if (node && text) node.textContent = text;
  }

  function setFeatures(root, tier) {
    var list = root.querySelector("[data-features]");
    if (!list || !tier.features || !tier.features.length) return;
    list.textContent = "";
    tier.features.forEach(function (feature) {
      var item = document.createElement("li");
      item.textContent = feature;
      list.appendChild(item);
    });
  }

  function fillFree(card, tier) {
    setText(card, "[data-name]", tier.name);
    setText(card, "[data-amount]", money(tier.price_cents));
    setText(card, "[data-blurb]", tier.description);
    setFeatures(card, tier);
  }

  function fillPremium(card, tier, project) {
    var subscription = tier.pricing_model === "subscription";
    setText(card, "[data-name]", tier.name);
    setText(card, "[data-amount]", money(tier.price_cents));
    setText(card, "[data-per]", subscription ? "/ month" : "once");
    setText(card, "[data-blurb]", tier.description);
    setFeatures(card, tier);

    // The checkout needs this tier's id; without one embed.js would sell the
    // default tier, which is Free.
    var buy = card.querySelector("[data-buy]");
    buy.dataset.tierId = tier.id;
    if (subscription) buy.dataset.interval = "monthly";
    buy.textContent = "Get " + tier.name;

    // Trials are per tier: the button only appears when this tier has one.
    var trial = card.querySelector("[data-trial]");
    var hasTrial = tier.free_trial && tier.free_trial.enabled;
    if (hasTrial) {
      trial.dataset.tierId = tier.id;
      trial.textContent = "Start a " + tier.free_trial.days + "-day trial";
    }

    function show(state) {
      buy.hidden = state !== "buy";
      trial.hidden = state !== "buy" || !hasTrial;
      card.querySelector("[data-current]").hidden = state !== "current";
      card.querySelector("[data-team]").hidden = state !== "team";
    }

    var manage = card.querySelector("[data-manage]");
    if (manage && project.seller && project.slug) {
      manage.href =
        "https://yard.sh/library/" +
        encodeURIComponent(project.seller.username) +
        "/" +
        encodeURIComponent(project.slug) +
        (subscription ? "/subscription" : "");
    }

    // Who is looking: the project's team (every course is already open to
    // them), a holder of this tier, or everyone else, who gets the button.
    var me = fetch(new URL("app/api/me", base), { credentials: "same-origin", redirect: "error" })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .catch(function () {
        return null;
      });
    var owned = window.yard.ownership
      ? window.yard.ownership().catch(function () {
          return null;
        })
      : Promise.resolve(null);

    Promise.all([me, owned]).then(function (results) {
      var who = results[0];
      var state = results[1];
      if (who && who.is_admin) return show("team");
      if (state && state.owned && state.tier_id === tier.id) return show("current");
      show("buy");
    });
  }

  // Free is the default tier; Premium is the other one.
  function fill(project) {
    var tiers = project.tiers.slice().sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    var free =
      tiers.find(function (t) {
        return t.is_default;
      }) ||
      tiers.find(function (t) {
        return t.price_cents === 0;
      }) ||
      null;
    var premium =
      tiers.find(function (t) {
        return t !== free && t.price_cents > 0;
      }) ||
      tiers.find(function (t) {
        return t !== free;
      }) ||
      null;
    if (free) fillFree(plans.querySelector('[data-plan="free"]'), free);
    if (premium) fillPremium(plans.querySelector('[data-plan="premium"]'), premium, project);
    if (window.yard.refresh) window.yard.refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wait);
  else wait();
})();
