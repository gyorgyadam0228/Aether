import { supabase } from '../config/supabase.js'

export async function fetchClassesWithAbilities() {
  return await supabase
    .from('classes')
    .select(
      `
      id,
      name_en,
      name_hu,
      description_en,
      description_hu,
      icon,
      icon_alt,
      class_abilities (
        abilities_id,
        abilities (
          id,
          name_en,
          name_hu,
          type,
          power,
          mana,
          description_en,
          description_hu,
          effectId,
          effects (
            id,
            name_en,
            name_hu,
            description_en,
            description_hu,
            isStackable,
            power,
            duration
          )
        )
      )
    `
    )
    .order('id', { ascending: true })
}

/** Összes effekt sor (képességhez nem kötöttek is, pl. chrono_flame, tendrils — csak kódból apply). */
export async function fetchAllEffects() {
  return await supabase
    .from('effects')
    .select(
      `
      id,
      name_en,
      name_hu,
      description_en,
      description_hu,
      isStackable,
      power,
      duration
    `
    )
    .order('id', { ascending: true })
}

/** Összes képesség (osztályhoz nem kötött ID-k is, pl. Chaos swap 6/8/10/11). */
export async function fetchAllAbilities() {
  return await supabase
    .from('abilities')
    .select(
      `
      id,
      name_en,
      name_hu,
      type,
      power,
      mana,
      description_en,
      description_hu,
      effectId,
      effects (
        id,
        name_en,
        name_hu,
        description_en,
        description_hu,
        isStackable,
        power,
        duration
      )
    `
    )
    .order('id', { ascending: true })
}

export async function fetchEnemiesWithAbilities() {
  return await supabase
    .from('enemies')
    .select(
      `
      id,
      name_en,
      name_hu,
      base_health,
      icon,
      icon_alt,
      enemies_abilities (
        abilities_id,
        chance,
        cooldown,
        abilities (
          id,
          name_en,
          name_hu,
          type,
          power,
          mana,
          description_en,
          description_hu,
          effectId,
          effects (
            id,
            name_en,
            name_hu,
            description_en,
            description_hu,
            isStackable,
            power,
            duration
          )
        )
      )
    `
    )
    .order('id', { ascending: true })
}
