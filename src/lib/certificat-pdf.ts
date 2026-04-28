/**
 * Génération du PDF de certificat de parcours complet "Impôts Facile".
 * Utilise jsPDF côté navigateur. Format A4 paysage.
 * Pas de score : mention "Parcours validé" uniquement.
 */
import { jsPDF } from 'jspdf';

export interface CertificatData {
  numero: string;
  prenom: string | null;
  nom: string | null;
  plan: string;
  nb_modules_valides: number;
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
  doc.text('Certificat de parcours', W / 2, 58, { align: 'center' });

  // Sous-titre
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(TEXT_MUTED);
  doc.text('Délivré au terme du parcours pédagogique complet Impôts Facile', W / 2, 66, { align: 'center' });

  // Décerné à
  doc.setFontSize(12);
  doc.setTextColor(TEXT_DARK);
  doc.text('Ce certificat est décerné à', W / 2, 84, { align: 'center' });

  const fullName = [data.prenom, data.nom].filter(Boolean).join(' ').trim() || 'Apprenant·e';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(PRIMARY);
  doc.text(fullName, W / 2, 100, { align: 'center' });

  // Souligné jaune sous le nom
  doc.setDrawColor(ACCENT);
  doc.setLineWidth(1.5);
  const nameWidth = doc.getTextWidth(fullName);
  doc.line(W / 2 - nameWidth / 2 - 5, 104, W / 2 + nameWidth / 2 + 5, 104);

  // Mention principale
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(TEXT_DARK);
  doc.text("pour avoir suivi et validé l'intégralité du parcours pédagogique", W / 2, 120, { align: 'center' });

  // Mention "Parcours validé"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(PRIMARY);
  doc.text('« Parcours validé »', W / 2, 134, { align: 'center' });

  // Précision modules
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(TEXT_MUTED);
  doc.text(
    `${data.nb_modules_valides} module${data.nb_modules_valides > 1 ? 's' : ''} validé${data.nb_modules_valides > 1 ? 's' : ''} avec succès`,
    W / 2,
    143,
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
  doc.text("Date d'obtention", W / 2, footerY, { align: 'center' });
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
  doc.save(`Certificat-Parcours-${safeName}-${data.numero}.pdf`);
}
