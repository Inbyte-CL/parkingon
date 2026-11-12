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
 * POST /api/admin/supermarkets/check-ticket
 * Body: { ticketCode, sessionId }
 * Valida formato, fecha (mismo día Chile) y que la boleta no esté usada.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const ticketCodeRaw = String(body.ticketCode ?? body.ticket_code ?? '')
    const sessionId = String(body.sessionId ?? body.session_id ?? '')

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

    const { data: existing, error: existingError } = await supabase
      .from('discount_ticket_redemptions')
      .select('id')
      .eq('org_id', session.org_id)
      .eq('ticket_code', ticket.ticketCode)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ ok: false, code: 'ERROR', message: existingError.message }, { status: 500 })
    }
    // Solo está "usada" si ya hubo un canje confirmado (pago/cierre con descuento).
    if (existing) return fail('ALREADY_USED')

    let query = supabase
      .from('supermarkets')
      .select(`
        id, name, store_number, status, org_id,
        supermarket_discount_rules(id, min_ticket_amount, max_ticket_amount, free_minutes, description, status)
      `)
      .eq('store_number', ticket.storeNumber)
      .eq('status', 'active')
      .eq('org_id', session.org_id)
      .limit(1)

    const { data: supermarket, error: smError } = await query.maybeSingle()
    if (smError) {
      return NextResponse.json({ ok: false, code: 'ERROR', message: smError.message }, { status: 500 })
    }
    if (!supermarket) return fail('NO_SUPERMARKET')

    const activeRules = (supermarket.supermarket_discount_rules ?? []).filter(
      (r: any) => r.status === 'active'
    )

    return NextResponse.json({
      ok: true,
      ticket: {
        ticketCode: ticket.ticketCode,
        storeNumber: ticket.storeNumber,
        amount: ticket.amount,
        ticketDate: ticket.ticketDateIso,
        timeRaw: ticket.timeRaw,
      },
      supermarket: {
        ...supermarket,
        supermarket_discount_rules: activeRules,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, code: 'ERROR', message: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
