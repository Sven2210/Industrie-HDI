import React, { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { AntragData } from '../types/antrag';
import { initialAntragData } from '../types/antrag';
import { dateiZuDokument } from '../utils/fragebogenEinlesen';
import { leseFragebogenKombiniert } from '../utils/fragebogenKi';
import { istBild, leseNotiz } from '../utils/notizEinlesen';
import { wendeKombiniertAn } from '../utils/fragebogenUebernahme';

interface Props {
  open: boolean;
  underwriter?: string;
  onClose: () => void;
  onStart: (antrag: AntragData) => void;
}

const NeuerVorgangDialog: React.FC<Props> = ({ open, underwriter, onClose, onStart }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const leererAntrag = (): AntragData => {
    const antrag = initialAntragData();
    if (underwriter) antrag.underwriter = underwriter;
    return antrag;
  };

  const handleDatei = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    const istPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!istPdf && !istBild(file)) {
      setFehler('Bitte ein PDF oder ein Foto (JPG, PNG) auswählen.');
      return;
    }

    setLaedt(true);
    setFehler(null);
    try {
      let antrag = leererAntrag();
      if (istPdf) {
        const dokument = await dateiZuDokument(file);
        const kombi = await leseFragebogenKombiniert(dokument);
        antrag.analyse = { dokumente: [dokument] };
        antrag = wendeKombiniertAn(antrag, kombi, dokument.dateiname, { ersetzeStandardwerte: true });
      } else {
        // Foto/Notiz: nur per KI lesbar; das Bild wird nicht als Dokument zur Analyse abgelegt
        const kombi = await leseNotiz(file);
        antrag = wendeKombiniertAn(antrag, kombi, file.name, { ersetzeStandardwerte: true, ohneSparte: true });
      }
      onStart(antrag);
    } catch (err) {
      console.error('[NeuerVorgangDialog] Datei konnte nicht gelesen werden', err);
      setFehler(
        istPdf
          ? 'Der Fragebogen konnte nicht gelesen werden. Sie können den Vorgang auch ohne Dokument starten.'
          : `${err instanceof Error ? err.message : 'Das Foto konnte nicht gelesen werden.'} Sie können den Vorgang auch ohne Dokument starten.`,
      );
    } finally {
      setLaedt(false);
    }
  };

  return (
    <Dialog open={open} onClose={laedt ? undefined : onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem' }}>Neuen Vorgang anlegen</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 2.5 }}>
          Laden Sie den ausgefüllten Fragebogen hoch — die Angaben werden automatisch in den Antrag
          übernommen, Sie prüfen sie anschließend nur noch.
        </Typography>

        <Box
          role="button"
          tabIndex={0}
          onClick={() => !laedt && inputRef.current?.click()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !laedt) inputRef.current?.click(); }}
          sx={{
            p: 4, textAlign: 'center', border: '2px dashed #CBD5E1', borderRadius: 2.5, bgcolor: '#F8FAFC',
            cursor: laedt ? 'default' : 'pointer', transition: 'all 0.15s',
            '&:hover': laedt ? {} : { borderColor: 'primary.main', bgcolor: '#fff' },
          }}
        >
          {laedt ? (
            <>
              <CircularProgress size={28} />
              <Typography sx={{ mt: 1.5, fontSize: '0.85rem', color: '#64748B' }}>Wird gelesen … (bei Fotos und Lücken kann das einige Sekunden dauern)</Typography>
            </>
          ) : (
            <>
              <UploadFileIcon sx={{ fontSize: 34, color: 'primary.main' }} />
              <Typography sx={{ mt: 0.5, fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>
                Fragebogen (PDF) oder Foto auswählen
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>PDF, Scan oder Foto einer Notiz (z. B. handschriftliche Adresse)</Typography>
            </>
          )}
          <input ref={inputRef} type="file" accept=".pdf,application/pdf,image/jpeg,image/png,image/webp" hidden onChange={handleDatei} />
        </Box>

        <Typography sx={{ mt: 2, fontSize: '0.74rem', color: '#64748B' }}>
          Hinweis: Fotos sowie PDFs mit Lücken oder ohne Text werden zur Auswertung an den
          adesso AI Hub gesendet (sofern eingerichtet). So gelesene Felder sind im Antrag gelb markiert
          und sollten geprüft werden.
        </Typography>

        {fehler && <Alert severity="warning" sx={{ mt: 2 }}>{fehler}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={laedt}>Abbrechen</Button>
        <Button variant="outlined" onClick={() => onStart(leererAntrag())} disabled={laedt}>Ohne Dokument starten</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NeuerVorgangDialog;
