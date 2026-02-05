import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { Reservation } from '../entities/reservation.entity';

@Injectable()
export class PdfService {
  /**
   * Génère les données JSON pour le QR code
   */
  generateQrCodeData(reservation: Reservation): string {
    const qrData = {
      id: reservation.reservationNumber,
      e: reservation.eventId,
      u: reservation.userId,
      t: reservation.numberOfTickets,
      s: reservation.status,
    };
    return JSON.stringify(qrData);
  }

  /**
   * Génère une image QR code en base64
   */
  async generateQrCodeImage(data: string): Promise<string> {
    return QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  /**
   * Génère un ticket PDF pour une réservation
   */
  async generateTicketPdf(reservation: Reservation): Promise<Buffer> {
    // Générer le QR code avec les données JSON
    const qrData = this.generateQrCodeData(reservation);
    const qrCodeImage = await this.generateQrCodeImage(qrData);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [400, 650], // Format ticket compact
          margin: 30,
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageWidth = 400;
        const margin = 30;
        const contentWidth = pageWidth - margin * 2;

        // En-tête avec logo
        this.drawHeader(doc, contentWidth, margin);

        // Ligne de séparation
        this.drawSeparator(doc, margin, contentWidth);

        // Informations de la réservation
        this.drawReservationInfo(doc, reservation, margin);

        // Ligne de séparation
        this.drawSeparator(doc, margin, contentWidth);

        // Informations de l'événement
        this.drawEventInfo(doc, reservation, margin);

        // Ligne de séparation
        this.drawSeparator(doc, margin, contentWidth);

        // Informations du participant
        this.drawParticipantInfo(doc, reservation, margin);

        // Ligne de séparation pointillée
        this.drawDottedSeparator(doc, margin, contentWidth);

        // QR Code réel
        this.drawQrCode(doc, qrCodeImage, margin, contentWidth);

        // Pied de page
        this.drawFooter(doc, reservation, margin, contentWidth);

        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    contentWidth: number,
    margin: number,
  ): void {
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text('PLANORA', margin, 30, { width: contentWidth, align: 'center' });

    doc.moveDown(0.3);

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Ticket de confirmation', { width: contentWidth, align: 'center' });

    doc.moveDown(0.8);
  }

  private drawSeparator(
    doc: PDFKit.PDFDocument,
    margin: number,
    contentWidth: number,
  ): void {
    doc
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .moveTo(margin, doc.y)
      .lineTo(margin + contentWidth, doc.y)
      .stroke();
    doc.moveDown(0.6);
  }

  private drawDottedSeparator(
    doc: PDFKit.PDFDocument,
    margin: number,
    contentWidth: number,
  ): void {
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .dash(5, { space: 3 })
      .moveTo(margin, doc.y)
      .lineTo(margin + contentWidth, doc.y)
      .stroke()
      .undash();
    doc.moveDown(0.6);
  }

  private drawReservationInfo(
    doc: PDFKit.PDFDocument,
    reservation: Reservation,
    margin: number,
  ): void {
    const statusLabel = this.getStatusLabel(reservation.status);
    const statusColor = this.getStatusColor(reservation.status);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Numero de reservation', margin);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .text(reservation.reservationNumber, margin);

    doc.moveDown(0.3);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Statut: ', margin, doc.y, { continued: true })
      .font('Helvetica-Bold')
      .fillColor(statusColor)
      .text(statusLabel);

    doc.moveDown(0.6);
  }

  private drawEventInfo(
    doc: PDFKit.PDFDocument,
    reservation: Reservation,
    margin: number,
  ): void {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text('EVENEMENT', margin);

    doc.moveDown(0.3);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .text(reservation.eventTitle || 'Evenement', margin);

    doc.moveDown(0.3);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Date: ', margin, doc.y, { continued: true })
      .fillColor('#1e293b')
      .text(this.formatDate(reservation.eventDate));

    doc.moveDown(0.2);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Lieu: ', margin, doc.y, { continued: true })
      .fillColor('#1e293b')
      .text(reservation.eventLocation || 'A definir');

    doc.moveDown(0.6);
  }

  private drawParticipantInfo(
    doc: PDFKit.PDFDocument,
    reservation: Reservation,
    margin: number,
  ): void {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text('PARTICIPANT', margin);

    doc.moveDown(0.3);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Nom: ', margin, doc.y, { continued: true })
      .fillColor('#1e293b')
      .text(reservation.userName || 'Participant');

    doc.moveDown(0.2);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Email: ', margin, doc.y, { continued: true })
      .fillColor('#1e293b')
      .text(reservation.userEmail || '');

    doc.moveDown(0.2);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Nombre de places: ', margin, doc.y, { continued: true })
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .text(String(reservation.numberOfTickets || 1));

    doc.moveDown(0.2);

    const pricePerTicket =
      reservation.numberOfTickets > 0
        ? reservation.totalPrice / reservation.numberOfTickets
        : reservation.totalPrice;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Prix total: ', margin, doc.y, { continued: true })
      .font('Helvetica-Bold')
      .fillColor('#10b981')
      .text(
        `${reservation.totalPrice?.toFixed(2) || '0.00'} MAD (${reservation.numberOfTickets} x ${pricePerTicket.toFixed(2)} MAD)`,
      );

    doc.moveDown(0.6);
  }

  private drawQrCode(
    doc: PDFKit.PDFDocument,
    qrCodeImage: string,
    margin: number,
    contentWidth: number,
  ): void {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text('SCANNEZ POUR VERIFIER', margin, doc.y, {
        width: contentWidth,
        align: 'center',
      });

    doc.moveDown(0.5);

    // Dessiner le QR code réel
    const qrSize = 130;
    const qrX = margin + (contentWidth - qrSize) / 2;

    // Convertir le data URL en buffer et l'insérer
    const base64Data = qrCodeImage.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64Data, 'base64');

    doc.image(qrBuffer, qrX, doc.y, {
      width: qrSize,
      height: qrSize,
    });

    doc.y += qrSize + 10;

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text("Scannez ce QR code a l'entree de l'evenement", margin, doc.y, {
        width: contentWidth,
        align: 'center',
      });

    doc.moveDown(0.8);
  }

  private drawFooter(
    doc: PDFKit.PDFDocument,
    reservation: Reservation,
    margin: number,
    contentWidth: number,
  ): void {
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text('Ce ticket est personnel et non transferable.', margin, doc.y, {
        width: contentWidth,
        align: 'center',
      });

    doc.moveDown(0.2);

    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text(
        `Genere le ${this.formatDateShort(new Date())} | Planora ${new Date().getFullYear()}`,
        margin,
        doc.y,
        { width: contentWidth, align: 'center' },
      );
  }

  private formatDate(date: Date): string {
    if (!date) return 'Date non definie';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Date invalide';
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatDateShort(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirme',
      canceled: 'Annule',
      checked_in: 'Utilise',
      no_show: 'Non presente',
      refunded: 'Rembourse',
    };
    return labels[status] || status || 'Inconnu';
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      confirmed: '#10b981',
      canceled: '#ef4444',
      checked_in: '#3b82f6',
      no_show: '#6b7280',
      refunded: '#8b5cf6',
    };
    return colors[status] || '#64748b';
  }
}
