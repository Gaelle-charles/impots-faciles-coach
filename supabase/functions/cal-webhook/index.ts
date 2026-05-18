/**
 * Cal.com webhook receiver.
 *
 * Vérifie la signature HMAC SHA256 (header `x-cal-signature-256`) puis met
 * à jour la table `appointments` en fonction du `triggerEvent`.
 *
 * Toujours retourne 200 OK (sauf signature invalide) pour éviter les retries
 * agressifs de Cal.com.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('x-cal-signature-256');
  const secret = Deno.env.get('CAL_WEBHOOK_SECRET');

  if (!signature || !secret) {
    console.error('cal-webhook: missing signature or secret');
    return new Response('Missing signature or secret', { status: 401 });
  }

  const body = await req.text();

  // HMAC SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (signature !== expected) {
    console.error('cal-webhook: invalid signature', { received: signature.slice(0, 10), expected: expected.slice(0, 10) });
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    console.error('cal-webhook: invalid JSON', e);
    return new Response('Invalid payload', { status: 400 });
  }

  const { triggerEvent, payload: data } = payload ?? {};
  console.log('cal-webhook event:', triggerEvent, 'uid:', data?.uid);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED': {
        const attendee = data?.attendees?.[0];
        if (!attendee?.email) break;

        // Lookup user_id by email (may be null if not registered)
        let userId: string | null = null;
        try {
          const { data: usersData } = await supabase.auth.admin.listUsers();
          const match = usersData?.users?.find(
            (u: any) => u.email?.toLowerCase() === attendee.email.toLowerCase(),
          );
          userId = match?.id ?? null;
        } catch (e) {
          console.error('cal-webhook: user lookup failed', e);
        }

        await supabase.from('appointments').upsert(
          {
            user_id: userId,
            user_email: attendee.email,
            user_name: attendee.name ?? null,
            scheduled_at: data.startTime,
            duration_minutes: data.length ?? 60,
            cal_booking_uid: data.uid,
            cal_event_type_id: data.eventTypeId ?? null,
            stripe_payment_intent_id: data.payment?.[0]?.externalId ?? null,
            meeting_url: data.location || data.metadata?.videoCallUrl || null,
            status: 'scheduled',
          },
          { onConflict: 'cal_booking_uid' },
        );
        break;
      }

      case 'BOOKING_CANCELLED': {
        await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: data.cancellationReason ?? null,
          })
          .eq('cal_booking_uid', data.uid);
        break;
      }

      case 'BOOKING_RESCHEDULED': {
        await supabase
          .from('appointments')
          .update({ scheduled_at: data.startTime })
          .eq('cal_booking_uid', data.uid);
        break;
      }

      case 'MEETING_ENDED': {
        await supabase
          .from('appointments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('cal_booking_uid', data.uid);
        break;
      }

      default:
        console.log('cal-webhook: unhandled event', triggerEvent);
    }
  } catch (e) {
    console.error('cal-webhook: processing error', e);
    // On retourne quand même 200 pour ne pas déclencher les retries Cal.com.
  }

  return new Response(
    JSON.stringify({ received: true, event: triggerEvent }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 },
  );
});
