/**
 * Génération du PDF de certificat de réussite quiz.
 * Utilise jsPDF côté navigateur. Format A4 paysage.
 */
import { jsPDF } from 'jspdf';

export interface CertificatData {
  numero: string;
  prenom: string | null;
  nom: string | null;
  module_titre: string;
  pourcentage: number;
  score: number;
  score_max: number;
  date_obtention: string; // ISO
}

const PRIMARY = '#2C1338'; // violet brand
const ACCENT = '#F9E900';  // jaune brand
const TEXT_DARK = '#1f1235';
const TEXT_MUTED = '#5b5366';

function getVerifyUrl(numero: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/verifier-certificat/${numero}`;
  }
  return `https://impots-faciles-coach.lovable.app/verifier-certificat/${numero}`;
}

export function generateCertificatPdf(data: CertificatData): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;

  // Fond
  doc.setFillColor(252, 250, 255);
  doc.rect(0, 0, W, H, 'F');

  // Cadre principal violet
  doc.setDrawColor(PRIMARY);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, W - 20, H - 20);

  // Cadre intérieur fin
  doc.setLineWidth(0.3);
  doc.rect(14, 14, W - 28, H - 28);

  // Bandeau de tête violet
  doc.setFillColor(PRIMARY);
  doc.rect(14, 14, W - 28, 22, 'F');

  // Marque
  doc.setTextColor(ACCENT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('IMPÔTS FACILE', W / 2, 22, { align: 'center' });

  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Plateforme de formation pédagogique aux impôts', W / 2, 30, { align: 'center' });

  // Titre certificat
  doc.setTextColor(PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('Certificat de réussite', W / 2, 58, { align: 'center' });

  // Sous-titre
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(TEXT_MUTED);
  doc.text('Délivré dans le cadre du parcours de formation pédagogique', W / 2, 66, { align: 'center' });

  // Décerné à
  doc.setFontSize(12);
  doc.setTextColor(TEXT_DARK);
  doc.text('Ce certificat est décerné à', W / 2, 82, { align: 'center' });

  const fullName = [data.prenom, data.nom].filter(Boolean).join(' ').trim() || 'Apprenant·e';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(PRIMARY);
  doc.text(fullName, W / 2, 95, { align: 'center' });

  // Souligné jaune sous le nom
  doc.setDrawColor(ACCENT);
  doc.setLineWidth(1.5);
  const nameWidth = doc.getTextWidth(fullName);
  doc.line(W / 2 - nameWidth / 2 - 5, 99, W / 2 + nameWidth / 2 + 5, 99);

  // Pour avoir terminé
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(TEXT_DARK);
  doc.text("pour avoir suivi et validé avec succès le module", W / 2, 112, { align: 'center' });

  // Module
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(PRIMARY);
  const moduleLines = doc.splitTextToSize(`« ${data.module_titre} »`, W - 60);
  doc.text(moduleLines, W / 2, 122, { align: 'center' });

  // Score
  const scoreY = 122 + (moduleLines.length * 6) + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(TEXT_DARK);
  doc.text(
    `avec un score de ${Math.round(data.pourcentage)}% (${data.score}/${data.score_max} bonnes réponses)`,
    W / 2,
    scoreY,
    { align: 'center' },
  );

  // Bas de page : numéro + date + URL vérification
  const footerY = H - 30;

  doc.setDrawColor(PRIMARY);
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 6, W - 20, footerY - 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(PRIMARY);
  doc.text('N° du certificat', 22, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_DARK);
  doc.text(data.numero, 22, footerY + 5);

  // Date
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PRIMARY);
  doc.text('Date d\'obtention', W / 2, footerY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_DARK);
  doc.text(
    new Date(data.date_obtention).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
    W / 2,
    footerY + 5,
    { align: 'center' },
  );

  // Vérification
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PRIMARY);
  doc.text('Vérification', W - 22, footerY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_DARK);
  doc.setFontSize(8);
  doc.text(getVerifyUrl(data.numero), W - 22, footerY + 5, { align: 'right' });

  // Disclaimer pédagogique en bas
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Document pédagogique. Ne constitue pas une certification professionnelle au sens du RNCP.',
    W / 2,
    H - 14,
    { align: 'center' },
  );

  return doc;
}

export function downloadCertificatPdf(data: CertificatData) {
  const doc = generateCertificatPdf(data);
  const safeName = [data.prenom, data.nom].filter(Boolean).join('-').trim() || 'certificat';
  doc.save(`Certificat-${safeName}-${data.numero}.pdf`);
}
