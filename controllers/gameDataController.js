import {
  fetchAllAbilities,
  fetchAllEffects,
  fetchClassesWithAbilities,
  fetchEnemiesWithAbilities,
} from '../models/gameDataModell.js'

/** Maps DB effect names to stable keys used by the browser combat code (see gameData.effectDefinitions). */
/** `hu` | `en` from GET /game-data?lang= */
function resolveGameDataLang(req) {
  const q = req.query?.lang
  if (q === 'en' || q === 'hu') return q
  return 'hu'
}

/**
 * Display string: Hungarian when lang is hu and *_hu is non-empty; otherwise English, then hu fallback.
 * Effect/ability *keys* must stay derived from English only (see effectKeyFromRow).
 */
function pickLocalized(lang, enVal, huVal) {
  const en = enVal != null ? String(enVal).trim() : ''
  const hu = huVal != null ? String(huVal).trim() : ''
  if (lang === 'hu' && hu) return hu
  if (en) return en
  return hu
}

const EFFECT_NAME_TO_KEY = {
  Poison: 'poison',
  Burn: 'burn',
  Stun: 'stun',
  Weakness: 'weakness',
  'Chrono-flame': 'chrono_flame',
  Chrono_flame: 'chrono_flame',
  'God of Time': 'god_of_time',
  Cracked: 'cracked',
  Aiming: 'aiming',
  'God of Chaos': 'god_of_chaos',
  Broken: 'broken',
  Reshaping: 'reshaping',
  'God of Divinity': 'god_of_divinity',
  Divinity: 'divinity',
  'God of Death': 'god_of_death',
  Tendrils: 'tendrils',
  Impaled: 'impaled',
  Drained: 'drained',
}

function effectKeyFromRow(effectRow) {
  if (!effectRow) return null
  const name = (effectRow.name_en ?? effectRow.name)?.trim()
  if (!name) return null
  if (EFFECT_NAME_TO_KEY[name]) return EFFECT_NAME_TO_KEY[name]
  return name
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
}

function normalizeEffect(effectRow, lang) {
  if (!effectRow) return null
  const key = effectKeyFromRow(effectRow)
  return {
    id: effectRow.id,
    key,
    name: pickLocalized(lang, effectRow.name_en ?? effectRow.name, effectRow.name_hu),
    description: pickLocalized(
      lang,
      effectRow.description_en ?? effectRow.description,
      effectRow.description_hu
    ),
    isStackable: effectRow.isStackable,
    power: effectRow.power,
    duration: effectRow.duration,
  }
}

function normalizeAbility(abilityRow, lang) {
  if (!abilityRow) return null
  const effectRow = abilityRow.effects ?? null
  const effectDetail = normalizeEffect(effectRow, lang)
  const effectKey = effectKeyFromRow(effectRow)
  const manaVal = abilityRow.mana
  return {
    id: abilityRow.id,
    name: pickLocalized(lang, abilityRow.name_en ?? abilityRow.name, abilityRow.name_hu),
    type: abilityRow.type,
    power: abilityRow.power,
    mana: manaVal == null ? '0' : String(manaVal),
    description: pickLocalized(
      lang,
      abilityRow.description_en ?? abilityRow.description ?? '',
      abilityRow.description_hu
    ),
    effectId: abilityRow.effectId ?? null,
    /** String key for applyStatusEffect / UI (not the nested effect object). */
    effect: effectKey,
    effectDetail,
  }
}

function abilityForClient(a) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    power: a.power,
    mana: a.mana,
    description: a.description,
    effectId: a.effectId,
    effect: a.effect,
  }
}

export async function getGameData(req, res) {
  const lang = resolveGameDataLang(req)

  const [
    { data: classes, error: classesError },
    { data: enemies, error: enemiesError },
    { data: allAbilityRows, error: allAbilitiesError },
    { data: allEffectRows, error: allEffectsError },
  ] = await Promise.all([
    fetchClassesWithAbilities(),
    fetchEnemiesWithAbilities(),
    fetchAllAbilities(),
    fetchAllEffects(),
  ])

  if (classesError) return res.status(500).json({ error: classesError.message })
  if (enemiesError) return res.status(500).json({ error: enemiesError.message })
  if (allAbilitiesError) return res.status(500).json({ error: allAbilitiesError.message })
  if (allEffectsError) return res.status(500).json({ error: allEffectsError.message })

  const effectsById = new Map()
  const abilitiesById = new Map()

  const normalizedClasses =
    (classes ?? []).map((c) => {
      const abilityRows = (c.class_abilities ?? [])
        .map((ca) => ca.abilities)
        .filter(Boolean)
        .map((a) => {
          const ability = normalizeAbility(a, lang)
          if (ability?.effectDetail) {
            effectsById.set(ability.effectDetail.id, ability.effectDetail)
          }
          if (ability) abilitiesById.set(ability.id, ability)
          return ability
        })
        .filter(Boolean)

      return {
        id: c.id,
        name: pickLocalized(lang, c.name_en ?? c.name, c.name_hu),
        description: pickLocalized(lang, c.description_en ?? c.description, c.description_hu),
        icon: c.icon,
        iconAlt: c.icon_alt ?? null,
        abilities: abilityRows.map((a) => a.id),
      }
    }) ?? []

  const normalizedEnemies =
    (enemies ?? []).map((e) => {
      const enemyAbilities = (e.enemies_abilities ?? [])
        .map((ea) => {
          const ability = normalizeAbility(ea.abilities, lang)
          if (ability?.effectDetail) {
            effectsById.set(ability.effectDetail.id, ability.effectDetail)
          }
          if (ability) abilitiesById.set(ability.id, ability)

          return ability
            ? {
                abilityId: ability.id,
                chance: ea.chance,
                cooldown: ea.cooldown,
              }
            : null
        })
        .filter(Boolean)

      return {
        id: e.id,
        name: pickLocalized(lang, e.name_en ?? e.name, e.name_hu),
        baseHealth: e.base_health,
        /** Not in schema; combat no longer scales off this, default 0. */
        basePower: 0,
        icon: e.icon,
        iconAlt: e.icon_alt ?? null,
        abilities: enemyAbilities,
      }
    }) ?? []

  for (const row of allAbilityRows ?? []) {
    const ability = normalizeAbility(row, lang)
    if (ability?.effectDetail) {
      effectsById.set(ability.effectDetail.id, ability.effectDetail)
    }
    if (ability) abilitiesById.set(ability.id, ability)
  }

  // Effektek, amelyekhez nincs képesség kötve (pl. chrono_flame, tendrils — csak combat kód apply-olja).
  for (const row of allEffectRows ?? []) {
    const normalized = normalizeEffect(row, lang)
    if (normalized?.key) {
      effectsById.set(normalized.id, normalized)
    }
  }

  const abilitiesPayload = Array.from(abilitiesById.values()).map(abilityForClient)

  res.json({
    classes: normalizedClasses,
    abilities: abilitiesPayload,
    effects: Array.from(effectsById.values()),
    enemies: normalizedEnemies,
  })
}
