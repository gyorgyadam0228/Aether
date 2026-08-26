/**
 * Static UI strings (hu / en). Locale comes from localStorage.language ('hu' | 'en'), same as users.language.
 * Dynamic copy (abilities, classes, effects, enemies) comes from GET /game-data?lang=hu|en
 * (localStorage.language). The API picks *_hu vs *_en for display; effect keys stay English-based.
 */
const translations = {
  hu: {
    common: {
      back: '← Vissza',
      login_link: 'Bejelentkezés',
      app_name: 'Aether',
      profile_open_title: 'Profil megnyitása',
      alert_not_logged_in: 'Nem vagy bejelentkezve!',
    },
    registration: {
      title: 'Regisztráció',
      placeholder_name: 'Név',
      placeholder_email: 'E-mail',
      placeholder_password: 'Jelszó',
      registration: 'Regisztráció',
      tologin: 'Már van fiókom / Bejelentkezés',
    },
    login: {
      title: 'Bejelentkezés',
      placeholder_email: 'E-mail',
      placeholder_password: 'Jelszó',
      login: 'Bejelentkezés',
      toregistration: 'Még nincs fiókom',
    },
    menu: {
      page_title: 'Menü',
      play_button: 'Játék',
      options_button: 'Beállítások',
      profile_button: 'Profil',
      leaderboard_button: 'Ranglista',
      logout_button: 'Kijelentkezés',
    },
    options: {
      title: 'Beállítások',
      anonymity_setting: 'Anonimitás',
      anonymity_checkbox_title: 'A ranglistán ne jelenjen meg a neved',
      theme_setting: 'Téma',
      theme_dark_title: 'Sötét mód',
      language_setting: 'Nyelv',
      language_hu: 'Magyar',
      language_en: 'Angol',
      save: 'Mentés',
      msg_saved: 'Beállítások mentve.',
      msg_save_failed: 'Mentés sikertelen.',
      msg_network_error: 'Hálózati hiba.',
    },
    profile: {
      page_title: 'Profil',
      highscore: 'Legjobb pontszám: ',
      loading: 'Betöltés…',
      load_error_name: 'Hiba',
      load_error_hint: 'Nem sikerült betölteni a profilt.',
      load_error_network: 'Hálózati hiba a profil betöltésekor.',
      run_history_heading: 'Utolsó menetek',
      run_played_with: 'Futás ezzel: {class}',
      run_unknown_class: 'ismeretlen osztály',
      run_score: 'Pontszám',
      run_date: 'Dátum',
      run_history_empty: 'Még nincs egy futás sem.',
      run_history_error: 'Nem sikerült betölteni a meneteket.',
      theme_picker_title: 'Profilkép színtémák',
      theme_close: 'Bezárás',
      theme_default_title: 'Alapértelmezett (nincs téma)',
      theme_saving: 'Mentés…',
      theme_saved: 'Mentve.',
      theme_save_failed: 'Mentés sikertelen.',
      theme_network_error: 'Hálózati hiba.',
      avatar_open_themes: 'Profilkép témák választása',
      avatar_hover_edit: 'Profilkép szerkesztése',
    },
    leaderboard: {
      page_title: 'Ranglista',
      title: 'Legjobb pontszámok',
      update: 'Frissítés',
      rank: 'Helyezés',
      name: 'Név',
      score: 'Pontszám',
      loading: 'Betöltés…',
      invalid_response: 'Érvénytelen válasz a szervertől.',
      load_error: 'Nem sikerült betölteni a ranglistát.',
      empty: 'Még nincs adat.',
      you_tooltip: 'Ez te vagy',
      you_badge: 'Te',
    },
    classSelection: {
      title: 'Válaszd ki a karaktered',
      start_game: 'Játék indítása',
      loading_classes: 'Karakterek betöltése…',
      load_error: 'Nem sikerült betölteni a karaktereket. Próbáld újra később.',
    },
    game: {
      score_label: 'Pontszám:',
      hp: 'HP',
      mp: 'MP',
      surrender: 'Feladás',
      game_over: 'Játék vége!',
      final_score: 'Végső pontszám:',
      enemies_defeated: 'Legyőzött ellenfelek:',
      return_menu: 'Vissza a főmenübe',
      save_return: 'Mentés és kilépés',
      saving: 'Mentés…',
      ability_details: 'Képesség részletei',
      combat: {
        surrender: '{player} feladja!',
        enemy_appears: '{enemy} megjelenik!',
        enemy_defeated: '{enemy} legyőzve! Pontszám: +{score}',
        need_god_of_time: '{player} csak az Idő Istene hatás alatt használhatja ezt: {ability}!',
        reshaping_restore: '{character} újraformálódik és visszatölti az összes HP-t!',
        stunned_cannot_act: '{character} elkábult és nem tud cselekedni!',
        ability_summary: '{actor} ({ability}): {summary}',
        summary_dealt_damage: '{amount} sebzés',
        summary_healed_hp: '+{amount} HP',
        summary_restored_mp: '+{amount} MP',
        tick_line: '{character}: {summary}',
        tick_is: '{effects} aktív',
        tick_takes_poison: '{amount} sebzés méregből',
        tick_takes_burn: '{amount} sebzés égésből',
        tick_takes_chrono: '{amount} sebzés Időlángból',
        tick_restores_mp: '+{amount} MP',
        tick_chrono_field: 'Időláng jelzők +1 (az egész csatatér lángol)',
        applied_effect: '{effect} hatás alkalmazva: {target}',
        note: {
          revert_time_used_enemy_chrono: 'Az ellenfél {stacks} db Időláng jelzője sebzéssé alakult.',
          revert_time_removed_own_chrono: '1 db saját Időláng jelző eltávolítva.',
          god_of_time_transform: 'Átalakulás: Idő Istene',
          god_of_time_chrono_both: 'Időláng jelzők +1: {player} és {enemy}.',
          restart_consumed_chrono: '{stacks} db Időláng jelző elfogyasztva Újrakezdés előtt.',
          restart_chrono_again: 'Időláng jelzők +1 újra: {player} és {enemy}.',
          cracked_bonus_broken: 'Megrepedt hatás már aktív volt: extra sebzés, Összetört hatás alkalmazva.',
          starts_aiming: 'Célzás: a következő lövés erősebb.',
          stops_aiming: 'Célzás vége.',
          god_of_chaos_transform: 'Átalakulás: Káosz Istene.',
          reality_shot_instant_kill: 'Azonnali kivégzés: {target} (Megrepedt/Összetört hatás miatt).',
          reality_shot_hp_plus_50: 'Max HP +50, jelenlegi HP +50.',
          god_of_chaos_ends: 'A Káosz Istene forma véget ér.',
          god_of_divinity_transform: 'Átalakulás: Halhatatlanság Istene, +10 Istenség jelző.',
          divine_immortality_max_hp_from_divinity: 'Max HP +{hpIncrease} (elfogyasztott Istenség jelzők alapján).',
          into_pieces_reshaping: 'Átalakuló hatás aktív: ha halálos sebzés jönne, megment.',
          god_of_death_spent: 'A Halál Istene hatás elhasználva az erősített csapáshoz.',
          tendrils_plus_one: '+1 Indák jelző.',
          used_tendrils_in_calc: 'Sebzés számításnál {stacks} db Indák jelző lett figyelembe véve.',
          god_of_death_transform: 'Átalakulás: Halál Istene.',
          tendrils_plus_five: '+5 Indák jelző.',
          deaths_maw_heal_reduced:
            'Gyógyítás csökkentve {reductionPercent}%-kal ({drainedStacks} db Kimerült jelző a célponton: {target}).',
          deaths_maw_no_heal: 'Nem gyógyít (a célpont túl Kimerült: {target}).',
        },
      },
    },
  },
  en: {
    common: {
      back: '← Back',
      login_link: 'Log in',
      app_name: 'Aether',
      profile_open_title: 'Open profile',
      alert_not_logged_in: 'You are not logged in.',
    },
    registration: {
      title: 'Registration',
      placeholder_name: 'Name',
      placeholder_email: 'E-mail',
      placeholder_password: 'Password',
      registration: 'Register',
      tologin: 'I already have an account / Log-in',
    },
    login: {
      title: 'Log-in',
      placeholder_email: 'E-mail',
      placeholder_password: 'Password',
      login: 'Log-in',
      toregistration: "I don't have an account",
    },
    menu: {
      page_title: 'Menu',
      play_button: 'Play',
      options_button: 'Options',
      profile_button: 'Profile',
      leaderboard_button: 'Leaderboard',
      logout_button: 'Log-out',
    },
    options: {
      title: 'Options',
      anonymity_setting: 'Anonymity',
      anonymity_checkbox_title: 'Hide your name on the leaderboard',
      theme_setting: 'Theme',
      theme_dark_title: 'Dark mode',
      language_setting: 'Language',
      language_hu: 'Hungarian',
      language_en: 'English',
      save: 'Save',
      msg_saved: 'Settings saved.',
      msg_save_failed: 'Could not save settings.',
      msg_network_error: 'Network error.',
    },
    profile: {
      page_title: 'Profile',
      highscore: 'Highscore: ',
      loading: 'Loading…',
      load_error_name: 'Error',
      load_error_hint: 'Could not load profile.',
      load_error_network: 'Network error while loading profile.',
      run_history_heading: 'Recent runs',
      run_played_with: 'Run played with: {class}',
      run_unknown_class: 'Unknown class',
      run_score: 'Score',
      run_date: 'Date',
      run_history_empty: 'No saved runs yet.',
      run_history_error: 'Could not load run history.',
      theme_picker_title: 'Avatar color themes',
      theme_close: 'Close',
      theme_default_title: 'Default (no theme)',
      theme_saving: 'Saving…',
      theme_saved: 'Saved.',
      theme_save_failed: 'Could not save.',
      theme_network_error: 'Network error.',
      avatar_open_themes: 'Choose avatar color themes',
      avatar_hover_edit: 'Edit profile icon',
    },
    leaderboard: {
      page_title: 'Leaderboard',
      title: 'Top highscores',
      update: 'Update',
      rank: 'Rank',
      name: 'Name',
      score: 'Score',
      loading: 'Loading…',
      invalid_response: 'Invalid response from server.',
      load_error: 'Could not load leaderboard.',
      empty: 'No data yet.',
      you_tooltip: "That's you",
      you_badge: 'You',
    },
    classSelection: {
      title: 'Choose your character',
      start_game: 'Start game',
      loading_classes: 'Loading classes…',
      load_error: 'Could not load classes. Please try again later.',
    },
    game: {
      score_label: 'Score:',
      hp: 'HP',
      mp: 'MP',
      surrender: 'Surrender',
      game_over: 'Game Over!',
      final_score: 'Final score:',
      enemies_defeated: 'Enemies defeated:',
      return_menu: 'Return to Main Menu',
      save_return: 'Save and return',
      saving: 'Saving…',
      ability_details: 'Ability details',
      combat: {
        surrender: '{player} surrenders!',
        enemy_appears: '{enemy} appears!',
        enemy_defeated: '{enemy} is defeated! Score: +{score}',
        need_god_of_time: '{player} must be the God of Time to use {ability}!',
        reshaping_restore: '{character} reshapes and restores all HP!',
        stunned_cannot_act: '{character} is stunned and cannot act!',
        ability_summary: '{actor} ({ability}): {summary}',
        summary_dealt_damage: 'dealt {amount} damage',
        summary_healed_hp: 'healed {amount} HP',
        summary_restored_mp: 'restored {amount} MP',
        tick_line: '{character}: {summary}',
        tick_is: 'is {effects}',
        tick_takes_poison: 'takes {amount} damage from poison',
        tick_takes_burn: 'takes {amount} damage from burn',
        tick_takes_chrono: 'takes {amount} damage from Chrono-flame',
        tick_restores_mp: 'restores {amount} MP',
        tick_chrono_field: 'Chrono-flame stacks +1 (field, both sides)',
        applied_effect: 'Applied {effect} to {target}',
        note: {
          revert_time_used_enemy_chrono: 'Converted {stacks} enemy Chrono-flame stack(s) into damage.',
          revert_time_removed_own_chrono: 'Removed 1 own Chrono-flame stack.',
          god_of_time_transform: 'Transforms into God of Time, max MP +{manaIncrease}.',
          god_of_time_chrono_both: 'Chrono-flame stacks +1 on {player} and {enemy}.',
          restart_consumed_chrono: 'Consumed {stacks} Chrono-flame stack(s) before refresh.',
          restart_chrono_again: 'Chrono-flame stacks +1 again on {player} and {enemy}.',
          cracked_bonus_broken: 'Target already had Cracked: extra damage, Broken applied.',
          starts_aiming: 'Starts aiming: next shots are empowered.',
          stops_aiming: 'Stops aiming.',
          god_of_chaos_transform: 'Transforms into God of Chaos.',
          reality_shot_instant_kill: 'Instant kill on {target} (Cracked or Broken).',
          reality_shot_hp_plus_50: 'Max HP +50, current HP +50.',
          god_of_chaos_ends: 'God of Chaos form ends.',
          god_of_divinity_transform: 'Transforms into God of Divinity, +10 Divinity stacks.',
          divine_immortality_max_hp_from_divinity: 'Max HP +{hpIncrease} from consumed Divinity.',
          into_pieces_reshaping: 'Reshaping buff: if lethal damage would land, you survive.',
          god_of_death_spent: 'Spent God of Death for empowered hit.',
          tendrils_plus_one: '+1 tendril stack.',
          used_tendrils_in_calc: 'Used {stacks} tendril stack(s) in the damage calc.',
          god_of_death_transform: 'Transforms into God of Death.',
          tendrils_plus_five: '+5 tendril stacks.',
          deaths_maw_heal_reduced:
            'Heal reduced by {reductionPercent}% ({drainedStacks} Drained stack(s) on {target}).',
          deaths_maw_no_heal: 'No heal from drain (target too Drained: {target}).',
        },
      },
    },
  },
}

function lookup(lang, keyPath) {
  const parts = keyPath.split('.')
  let node = translations[lang]
  for (let i = 0; i < parts.length; i++) {
    if (node == null || typeof node !== 'object') return undefined
    node = node[parts[i]]
  }
  return typeof node === 'string' ? node : undefined
}

function getLang() {
  const s = localStorage.getItem('language')
  if (s === 'en' || s === 'hu') return s
  return 'hu'
}

function t(keyPath) {
  if (keyPath == null || typeof keyPath !== 'string') return ''
  const lang = getLang()
  let value = lookup(lang, keyPath)
  if (value !== undefined) return value
  if (lang !== 'hu') {
    value = lookup('hu', keyPath)
    if (value !== undefined) return value
  }
  return keyPath
}

function applyStaticI18n(root) {
  document.documentElement.lang = getLang()
  const el = root || document
  el.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n')
    if (key) node.textContent = t(key)
  })
  el.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const key = node.getAttribute('data-i18n-placeholder')
    if (key) node.placeholder = t(key)
  })
  el.querySelectorAll('[data-i18n-title]').forEach((node) => {
    const key = node.getAttribute('data-i18n-title')
    if (key) node.title = t(key)
  })
  el.querySelectorAll('[data-i18n-value]').forEach((node) => {
    const key = node.getAttribute('data-i18n-value')
    if (key && 'value' in node) node.value = t(key)
  })
}

window.getLang = getLang
window.t = t
window.applyStaticI18n = applyStaticI18n

function initStaticI18n() {
  applyStaticI18n()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStaticI18n)
} else {
  initStaticI18n()
}
