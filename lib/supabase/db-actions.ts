"use server"

import { createClient } from "./server"
import type { Player } from "../game-store"

// Convert database row to Player type
function rowToPlayer(row: {
  id: string
  name: string
  college?: string | null
  department?: string | null
  year_of_study?: string | null
  contact_number?: string | null
  email?: string | null
  score: number
  round1_score: number
  round2_score: number
  round1_completed: boolean
  round2_enabled: boolean
  round2_completed: boolean
  tab_switch_count: number
  is_disqualified: boolean
  round1_answers: Record<number, number> | null
  start_time: number | null
}): Player {
  return {
    id: row.id,
    name: row.name,
    score: row.score,
    round1Score: row.round1_score,
    round2Score: row.round2_score,
    round1Completed: row.round1_completed,
    round2Enabled: row.round2_enabled,
    round2Completed: row.round2_completed,
    tabSwitchCount: row.tab_switch_count,
    isDisqualified: row.is_disqualified,
    round1Answers: row.round1_answers || {},
    startTime: row.start_time ?? undefined,
    college: row.college ?? '',
    department: row.department ?? '',
    yearOfStudy: row.year_of_study ?? '',
    contactNumber: row.contact_number ?? '',
    email: row.email ?? '',
  }
}

// Convert Player to database row format
function playerToRow(player: Player) {
  return {
    id: player.id,
    name: player.name,
    college: player.college || null,
    department: player.department || null,
    year_of_study: player.yearOfStudy || null,
    contact_number: player.contactNumber || null,
    email: player.email || null,
    score: player.score,
    round1_score: player.round1Score,
    round2_score: player.round2Score,
    round1_completed: player.round1Completed,
    round2_enabled: player.round2Enabled,
    round2_completed: player.round2Completed,
    tab_switch_count: player.tabSwitchCount,
    is_disqualified: player.isDisqualified,
    round1_answers: player.round1Answers,
    start_time: player.startTime ?? null,
  }
}

export async function fetchAllPlayers(): Promise<Player[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("score", { ascending: false })

  if (error) {
    console.error("Error fetching players:", error)
    return []
  }

  return (data || []).map(rowToPlayer)
}

export async function fetchPlayerById(id: string): Promise<Player | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching player:", error)
    return null
  }

  return rowToPlayer(data)
}

export async function createPlayer(
  code: string,
  studentDetails?: {
    name?: string
    college?: string
    department?: string
    yearOfStudy?: string
    contactNumber?: string
    email?: string
  }
): Promise<Player | null> {
  const supabase = await createClient()
  const normalizedCode = code.toUpperCase().trim()

  const newPlayer: Player = {
    id: normalizedCode,
    name: studentDetails?.name || normalizedCode,
    score: 0,
    round1Score: 0,
    round2Score: 0,
    round1Completed: false,
    round2Enabled: false,
    round2Completed: false,
    tabSwitchCount: 0,
    isDisqualified: false,
    round1Answers: {},
    college: studentDetails?.college || '',
    department: studentDetails?.department || '',
    yearOfStudy: studentDetails?.yearOfStudy || '',
    contactNumber: studentDetails?.contactNumber || '',
    email: studentDetails?.email || '',
  }

  const { data, error } = await supabase
    .from("players")
    .insert(playerToRow(newPlayer))
    .select()
    .single()

  if (error) {
    console.error("Error creating player:", error)
    return null
  }

  return rowToPlayer(data)
}

export async function updatePlayer(player: Player): Promise<Player | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("players")
    .update({
      ...playerToRow(player),
      updated_at: new Date().toISOString(),
    })
    .eq("id", player.id)
    .select()
    .single()

  if (error) {
    console.error("Error updating player:", error)
    return null
  }

  return rowToPlayer(data)
}

export async function deletePlayer(id: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting player:", error)
    return false
  }

  return true
}

export async function enableRound2ForPlayer(playerId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("players")
    .update({ round2_enabled: true, updated_at: new Date().toISOString() })
    .eq("id", playerId)

  if (error) {
    console.error("Error enabling round 2:", error)
    return false
  }

  return true
}

export async function disableRound2ForPlayer(playerId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("players")
    .update({ round2_enabled: false, updated_at: new Date().toISOString() })
    .eq("id", playerId)

  if (error) {
    console.error("Error disabling round 2:", error)
    return false
  }

  return true
}

export async function resetAllPlayers(): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("players")
    .update({
      score: 0,
      round1_score: 0,
      round2_score: 0,
      round1_completed: false,
      round2_enabled: false,
      round2_completed: false,
      tab_switch_count: 0,
      is_disqualified: false,
      round1_answers: {},
      start_time: null,
      updated_at: new Date().toISOString(),
    })
    .neq("id", "") // Update all rows

  if (error) {
    console.error("Error resetting players:", error)
    return false
  }

  return true
}

export async function getLeaderboard(): Promise<Player[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_disqualified", false)
    .order("score", { ascending: false })

  if (error) {
    console.error("Error fetching leaderboard:", error)
    return []
  }

  return (data || []).map(rowToPlayer)
}
