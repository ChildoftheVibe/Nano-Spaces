import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { env } from '@/lib/env'

interface InvoiceData {
  orgId: string
  orgName: string
  orgEmail: string
  invoiceId: string
  tier: string
  amountUsd: number
  billingPeriodStart: Date
  billingPeriodEnd: Date
  paypalTransactionId: string | null
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)

  const brand = rgb(0.31, 0.494, 0.98) // #4F7EFA
  const dark = rgb(0.102, 0.114, 0.137) // #1A1D23
  const gray = rgb(0.608, 0.639, 0.686) // #9BA3AE

  // Header band
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: brand })

  // Brand name
  page.drawText('Nano Spaces', {
    x: 40,
    y: height - 55,
    font: helveticaBold,
    size: 22,
    color: rgb(1, 1, 1),
  })

  page.drawText('INVOICE', {
    x: width - 120,
    y: height - 55,
    font: helveticaBold,
    size: 18,
    color: rgb(1, 1, 1),
  })

  // Invoice metadata
  let y = height - 130
  const leftCol = 40
  const rightCol = 320

  const meta = [
    ['Invoice ID', data.invoiceId.slice(0, 8).toUpperCase()],
    ['Date', formatDate(new Date())],
    [
      'Billing period',
      `${formatDate(data.billingPeriodStart)} – ${formatDate(data.billingPeriodEnd)}`,
    ],
    ...(data.paypalTransactionId ? [['Transaction ID', data.paypalTransactionId]] : []),
  ]

  for (const [label, value] of meta) {
    page.drawText(label ?? '', { x: leftCol, y, font: helvetica, size: 10, color: gray })
    page.drawText(value ?? '', { x: rightCol, y, font: helvetica, size: 10, color: dark })
    y -= 20
  }

  // Billed to
  y -= 10
  page.drawText('Billed to', { x: leftCol, y, font: helveticaBold, size: 11, color: dark })
  y -= 18
  page.drawText(data.orgName, { x: leftCol, y, font: helvetica, size: 10, color: dark })
  y -= 16
  page.drawText(data.orgEmail, { x: leftCol, y, font: helvetica, size: 10, color: gray })

  // Line items table
  y -= 40
  page.drawLine({
    start: { x: leftCol, y },
    end: { x: width - leftCol, y },
    thickness: 0.5,
    color: gray,
  })
  y -= 20

  const tierLabel = data.tier.charAt(0).toUpperCase() + data.tier.slice(1)

  page.drawText('Description', { x: leftCol, y, font: helveticaBold, size: 10, color: gray })
  page.drawText('Amount', { x: width - 100, y, font: helveticaBold, size: 10, color: gray })

  y -= 18
  page.drawLine({
    start: { x: leftCol, y },
    end: { x: width - leftCol, y },
    thickness: 0.5,
    color: rgb(0.9, 0.9, 0.9),
  })
  y -= 20

  page.drawText(`Nano Spaces ${tierLabel} Plan — Monthly Subscription`, {
    x: leftCol,
    y,
    font: helvetica,
    size: 10,
    color: dark,
  })
  page.drawText(`$${data.amountUsd.toFixed(2)}`, {
    x: width - 100,
    y,
    font: helvetica,
    size: 10,
    color: dark,
  })

  y -= 30
  page.drawLine({
    start: { x: leftCol, y },
    end: { x: width - leftCol, y },
    thickness: 0.5,
    color: gray,
  })
  y -= 22

  page.drawText('Total', { x: leftCol, y, font: helveticaBold, size: 12, color: dark })
  page.drawText(`$${data.amountUsd.toFixed(2)} USD`, {
    x: width - 130,
    y,
    font: helveticaBold,
    size: 12,
    color: brand,
  })

  // Footer
  page.drawText(
    'Thank you for your business. This invoice was generated automatically by Nano Spaces.',
    {
      x: leftCol,
      y: 50,
      font: helvetica,
      size: 9,
      color: gray,
    },
  )

  const pdfBytes = await doc.save()
  return pdfBytes
}

export async function createAndStoreInvoice(
  data: InvoiceData & { invoiceRecordId?: string },
  requestId?: string,
): Promise<string | null> {
  try {
    const pdfBytes = await generateInvoicePdf(data)

    const admin = createAdminClient()
    const filename = `${data.orgId}/${data.invoiceId}.pdf`

    const { error: uploadError } = await admin.storage
      .from('invoices')
      .upload(filename, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      console.error('Invoice upload failed:', uploadError)
      return null
    }

    // Store the storage path (not a URL) — private bucket requires signed URLs generated on-demand
    if (data.invoiceRecordId) {
      await admin.from('invoices').update({ pdf_url: filename }).eq('id', data.invoiceRecordId)
    }

    // Generate a 7-day signed URL for the invoice email
    const { data: signedData } = await admin.storage
      .from('invoices')
      .createSignedUrl(filename, 7 * 24 * 60 * 60)
    const emailDownloadUrl = signedData?.signedUrl ?? `${env.NEXT_PUBLIC_APP_URL}/settings/billing`

    await sendInvoiceEmail(data, emailDownloadUrl, pdfBytes, requestId)

    return filename
  } catch (err) {
    console.error('createAndStoreInvoice error:', err)
    return null
  }
}

async function sendInvoiceEmail(
  data: InvoiceData,
  pdfUrl: string,
  _pdfBytes: Uint8Array,
  requestId?: string,
): Promise<void> {
  const tierLabel = data.tier.charAt(0).toUpperCase() + data.tier.slice(1)

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /></head><body style="font-family:Inter,sans-serif;background:#F7F8FA;margin:0;padding:0">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,.07)">
  <h2 style="font-family:'Plus Jakarta Sans',sans-serif;color:#1A1D23;margin:0 0 16px">🗓 Nano Spaces — Invoice</h2>
  <p style="color:#4B5563;line-height:1.6">Your payment for the <strong>${tierLabel} Plan</strong> has been received. Thank you!</p>
  <p style="color:#4B5563;line-height:1.6">Amount: <strong>$${data.amountUsd.toFixed(2)} USD</strong></p>
  <p style="text-align:center;margin:24px 0">
    <a href="${pdfUrl}" style="display:inline-block;padding:12px 24px;background:#4F7EFA;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Download Invoice PDF</a>
  </p>
  <p style="color:#9CA3AF;font-size:13px;margin-top:32px;padding-top:24px;border-top:1px solid #E5E7EB">Nano Spaces · ${env.NEXT_PUBLIC_APP_URL}</p>
</div></body></html>`

  await sendEmail({
    to: data.orgEmail,
    subject: `Invoice from Nano Spaces — ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)} Plan`,
    html,
    ...(requestId !== undefined ? { requestId } : {}),
  })
}
