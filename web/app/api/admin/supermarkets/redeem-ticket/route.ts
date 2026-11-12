import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  isTicketDateToday,
  parseSmuTicket,
  publicMessageForCode,
  type TicketValidationCode,
} from '@/lib/supermarkets/smuTicket'
import { requireOperatorSession } from '@/lib/auth/requireOperator'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function fail(code: TicketValidationCode, status = 400) {
  return NextResponse.json(
    { ok: false, code, message: publicMessageForCode(code) },
    { status }
  )
}

/**
 * POST /api/admin/supermarkets/redeem-ticket
 * Body: { ticketCode, sessionId, freeMinutes?, supermarketId? }
 * Canje atómico: inserta la boleta; si ya existe → ALREADY_USED.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const ticketCodeRaw = String(body.ticketCode ?? body.ticket_code ?? '')
    const sessionId = String(body.sessionId ?? body.session_id ?? '')
    const supermarketId = body.supermarketId ?? body.supermarket_id ?? null

    if (!ticketCodeRaw || !sessionId) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_CODE', message: 'ticketCode y sessionId son requeridos' },
        { status: 400 }
      )
    }

    const ticket = parseSmuTicket(ticketCodeRaw)
    if (!ticket) return fail('INVALID_CODE')
    if (!isTicketDateToday(ticket)) return fail('INVALID_DATE')

    const supabase = getSupabase()
    const access = await requireOperatorSession(request, sessionId)
    if ('error' in access) return access.error
    const session = access.session

    let supermarketQuery = supabase
      .from('supermarkets')
      .select('id, org_id, store_number, supermarket_discount_rules(min_ticket_amount,max_ticket_amount,free_minutes,status)')
      .eq('org_id', session.org_id)
      .eq('store_number', ticket.storeNumber)
      .eq('status', 'active')
    if (supermarketId) supermarketQuery = supermarketQuery.eq('id', supermarketId)
    const { data: supermarket } = await supermarketQuery.limit(1).maybeSingle()
    if (!supermarket) return fail('NO_SUPERMARKET')
    const matchingRule = (supermarket.supermarket_discount_rules ?? [])
      .filter((rule: any) => rule.status === 'active')
      .filter((rule: any) => ticket.amount >= Number(rule.min_ticket_amount ?? 0))
      .filter((rule: any) => rule.max_ticket_amount == null || ticket.amount <= Number(rule.max_ticket_amount))
      .sort((a: any, b: any) => Number(b.min_ticket_amount) - Number(a.min_ticket_amount))[0]
    const freeMinutes = Math.max(0, Number(matchingRule?.free_minutes ?? 0))

    // Idempotente: si ya se canjeó para ESTA misma sesión abierta, reutilizar.
    const { data: existing } = await supabase
      .from('discount_ticket_redemptions')
      .select('id, session_id, redeemed_at')
      .eq('org_id', session.org_id)
      .eq('ticket_code', ticket.ticketCode)
      .maybeSingle()

    if (existing) {
      if (existing.session_id === session.id && session.status === 'open') {
        return NextResponse.json({
          ok: true,
          alreadyRedeemed: true,
          redemption: {
            id: existing.id,
            redeemedAt: existing.redeemed_at,
            ticketCode: ticket.ticketCode,
          },
        })
      }
      return fail('ALREADY_USED')
    }

    const { data: redemption, error: insertError } = await supabase
      .from('discount_ticket_redemptions')
      .insert({
        org_id: session.org_id,
        parking_id: session.parking_id,
        session_id: session.id,
        ticket_code: ticket.ticketCode,
        store_number: ticket.storeNumber,
        ticket_date: ticket.ticketDateIso,
        ticket_amount: ticket.amount,
        free_minutes: freeMinutes,
        supermarket_id: supermarket.id,
      })
      .select('id, redeemed_at')
      .single()

    if (insertError) {
      // Carrera concurrente: re-leer y decidir
      if (insertError.code === '23505' || /duplicate|unique/i.test(insertError.message)) {
        const { data: raced } = await supabase
          .from('discount_ticket_redemptions')
          .select('id, session_id, redeemed_at')
          .eq('org_id', session.org_id)
          .eq('ticket_code', ticket.ticketCode)
          .maybeSingle()

        if (raced && raced.session_id === session.id && session.status === 'open') {
          return NextResponse.json({
            ok: true,
            alreadyRedeemed: true,
            redemption: {
              id: raced.id,
              redeemedAt: raced.redeemed_at,
              ticketCode: ticket.ticketCode,
            },
          })
        }
        return fail('ALREADY_USED')
      }
      return NextResponse.json(
        { ok: false, code: 'ERROR', message: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      redemption: {
        id: redemption.id,
        redeemedAt: redemption.redeemed_at,
        ticketCode: ticket.ticketCode,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, code: 'ERROR', message: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
