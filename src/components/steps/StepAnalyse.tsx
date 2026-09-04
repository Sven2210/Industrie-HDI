import React, { useRef, useState } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, Chip, CircularProgress, Select, MenuItem, TextField, Divider } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PublicIcon from '@mui/icons-material/Public';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import ForwardToInboxOutlinedIcon from '@mui/icons-material/ForwardToInboxOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { AntragData, BhvRisikoStufe, BhvKategorieErgebnis, ManuelleRisikoUeberschreibung, HochgeladenesDokument, Regelwerk, WeiterleitungsEintrag, VertriebsRueckmeldungEintrag, FreigabeErteiltEintrag, FreigabeAbgelehntEintrag } from '../../types/antrag';
import type { AppUser } from '../../types/user';
import { analysiereBhvFragebogen, berechneGesamteinschaetzung } from '../../utils/bhvAnalyse';
import type { BhvGesamteinschaetzung } from '../../utils/bhvAnalyse';
import { findeDokumentHinweise } from '../../utils/dokumentHinweise';
import { pruefeSanktionen } from '../../utils/sanktionsAnalyse';
import { analysiereRisiko } from '../../utils/risikoAnalyse';
import { istEigenerVorgang } from '../../utils/berechtigung';
import SanktionsPruefPanel from '../SanktionsPruefPanel';

function istAdresseVollstaendig(wa: AntragData['wagnisanschrift']): boolean {
  return !!(wa.strasse && wa.hausnummer && wa.plz && wa.ort && wa.land);
}

function StandortKarte({ lat, lon }: { lat: number; lon: number }) {
  const delta = 0.06;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  return (
    <Box sx={{ height: 220, borderRadius: 2, border: '1px solid #E2E8F0', mt: 1, overflow: 'hidden' }}>
      <iframe
        title="Standortkarte"
        src={src}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        loading="lazy"
      />
    </Box>
  );
}

const REGELWERK_LABELS: Record<Regelwerk, string> = {
  betriebshaftpflicht: 'Betriebshaftpflicht',
  itPolice: 'IT-Police',
  umwelthaftpflichtV: 'UmwelthaftpflichtV',
  umweltschadenV: 'UmweltschadenV',
  speditionen: 'Speditionen',
  verpackungsunternehmen: 'Verpackungsunternehmen',
  kfzRueckruf: 'KFZ-Rückruf',
  medizinprodukteAmg: 'Medizinprodukte/AMG',
  architektenIngenieure: 'Architekten/Ingenieure',
};

const STUFE_CONFIG: Record<BhvRisikoStufe, { color: string; bg: string; border: string; label: string }> = {
  niedrig: { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', label: 'Niedrig' },
  mittel: { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', label: 'Mittel' },
  hoch: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Hoch' },
  unbeantwortet: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Unbeantwortet' },
};

function formatGroesse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dateiLesen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function StufeChip({ stufe }: { stufe: BhvRisikoStufe }) {
  const c = STUFE_CONFIG[stufe];
  return (
    <Chip
      label={c.label}
      size="small"
      sx={{ bgcolor: c.bg, color: c.color, border: `1px solid ${c.border}`, fontWeight: 700, fontSize: '0.68rem' }}
    />
  );
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE');
}

const STUFE_OPTIONEN: BhvRisikoStufe[] = ['niedrig', 'mittel', 'hoch', 'unbeantwortet'];

interface KategorieZeileProps {
  index: number;
  kategorie: BhvKategorieErgebnis;
  ueberschreibung?: ManuelleRisikoUeberschreibung;
  onUeberschreiben: (stufe: BhvRisikoStufe, kommentar: string) => void;
}

function KategorieZeile({ index, kategorie, ueberschreibung, onUeberschreiben }: KategorieZeileProps) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [stufe, setStufe] = useState<BhvRisikoStufe>(ueberschreibung?.stufe ?? kategorie.stufe);
  const [kommentar, setKommentar] = useState('');

  const anzeigeStufe = ueberschreibung?.stufe ?? kategorie.stufe;

  const handleBearbeitenStarten = () => {
    setStufe(ueberschreibung?.stufe ?? kategorie.stufe);
    setKommentar('');
    setBearbeiten(true);
  };

  const handleSpeichern = () => {
    if (!kommentar.trim()) return;
    onUeberschreiben(stufe, kommentar.trim());
    setBearbeiten(false);
    setKommentar('');
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}>
          {index}. {kategorie.titel}
        </Typography>
        {!bearbeiten && (
          <Tooltip title="Risikoeinschätzung manuell anpassen">
            <IconButton size="small" onClick={handleBearbeitenStarten} sx={{ color: '#94A3B8', '&:hover': { color: '#0F172A' } }}>
              <EditOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {bearbeiten ? (
        <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Select
            size="small"
            fullWidth
            value={stufe}
            onChange={(e) => setStufe(e.target.value as BhvRisikoStufe)}
            sx={{ bgcolor: '#fff', fontSize: '0.82rem' }}
          >
            {STUFE_OPTIONEN.map((s) => (
              <MenuItem key={s} value={s}>{STUFE_CONFIG[s].label}</MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            placeholder="Kommentar (Pflichtfeld) — Begründung für die manuelle Änderung"
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            sx={{ bgcolor: '#fff' }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" size="small" disabled={!kommentar.trim()} onClick={handleSpeichern}>
              Speichern
            </Button>
            <Button variant="outlined" size="small" onClick={() => setBearbeiten(false)}>
              Abbrechen
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
                {ueberschreibung ? ueberschreibung.kommentar : kategorie.begruendung}
              </Typography>
              {ueberschreibung && (
                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 0.75, fontStyle: 'italic' }}>
                  Automatische Einschätzung: {kategorie.begruendung} ({STUFE_CONFIG[kategorie.stufe].label})
                </Typography>
              )}
            </Box>
            <StufeChip stufe={anzeigeStufe} />
          </Box>
          {ueberschreibung && (
            <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 1, pt: 1, borderTop: '1px solid #F1F5F9' }}>
              Manuell geändert von <strong>{ueberschreibung.erstelltVonName}</strong> am {formatDatum(ueberschreibung.erstelltAm)}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

interface GesamteinschaetzungBoxProps {
  automatisch: BhvGesamteinschaetzung;
  ueberschreibung?: ManuelleRisikoUeberschreibung;
  onUeberschreiben: (stufe: BhvRisikoStufe, kommentar: string) => void;
}

function GesamteinschaetzungBox({ automatisch, ueberschreibung, onUeberschreiben }: GesamteinschaetzungBoxProps) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [stufe, setStufe] = useState<BhvRisikoStufe>(ueberschreibung?.stufe ?? automatisch.stufe);
  const [kommentar, setKommentar] = useState('');

  const anzeigeStufe = ueberschreibung?.stufe ?? automatisch.stufe;

  const handleBearbeitenStarten = () => {
    setStufe(ueberschreibung?.stufe ?? automatisch.stufe);
    setKommentar('');
    setBearbeiten(true);
  };

  const handleSpeichern = () => {
    if (!kommentar.trim()) return;
    onUeberschreiben(stufe, kommentar.trim());
    setBearbeiten(false);
    setKommentar('');
  };

  return (
    <Box sx={{
      mt: 3, p: 2.5, bgcolor: STUFE_CONFIG[anzeigeStufe].bg,
      border: `1.5px solid ${STUFE_CONFIG[anzeigeStufe].border}`, borderRadius: 2.5,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: STUFE_CONFIG[anzeigeStufe].color, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Gesamteinschätzung (Kategorien 2–12)
            </Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: STUFE_CONFIG[anzeigeStufe].color }}>
              {STUFE_CONFIG[anzeigeStufe].label}
            </Typography>
          </Box>
        </Box>
        {!bearbeiten && (
          <Tooltip title="Gesamteinschätzung manuell anpassen">
            <IconButton size="small" onClick={handleBearbeitenStarten} sx={{ color: '#94A3B8', '&:hover': { color: '#0F172A' } }}>
              <EditOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {bearbeiten ? (
        <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Select
            size="small"
            fullWidth
            value={stufe}
            onChange={(e) => setStufe(e.target.value as BhvRisikoStufe)}
            sx={{ bgcolor: '#fff', fontSize: '0.82rem' }}
          >
            {STUFE_OPTIONEN.filter((s) => s !== 'unbeantwortet').map((s) => (
              <MenuItem key={s} value={s}>{STUFE_CONFIG[s].label}</MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            placeholder="Kommentar (Pflichtfeld) — Begründung für die manuelle Änderung"
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            sx={{ bgcolor: '#fff' }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" size="small" disabled={!kommentar.trim()} onClick={handleSpeichern}>
              Speichern
            </Button>
            <Button variant="outlined" size="small" onClick={() => setBearbeiten(false)}>
              Abbrechen
            </Button>
          </Box>
        </Box>
      ) : (
        <>
          <Typography sx={{ fontSize: '0.82rem', color: '#1E293B', lineHeight: 1.6 }}>
            {ueberschreibung ? ueberschreibung.kommentar : automatisch.empfehlung}
          </Typography>
          {ueberschreibung && (
            <>
              <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 0.75, fontStyle: 'italic' }}>
                Automatische Einschätzung: {automatisch.empfehlung} ({STUFE_CONFIG[automatisch.stufe].label})
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 1, pt: 1, borderTop: '1px solid rgba(15,23,42,0.08)' }}>
                Manuell geändert von <strong>{ueberschreibung.erstelltVonName}</strong> am {formatDatum(ueberschreibung.erstelltAm)}
              </Typography>
            </>
          )}
        </>
      )}
    </Box>
  );
}

interface WorkflowProps {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
  currentUser: AppUser;
  users: AppUser[];
}

const WorkflowSektion: React.FC<WorkflowProps> = ({ data, onChange, currentUser, users }) => {
  const [empfaengerId, setEmpfaengerId] = useState('');
  const [grund, setGrund] = useState('');
  const [ablehnungsGrund, setAblehnungsGrund] = useState('');
  const [anmerkung, setAnmerkung] = useState('');

  const workflow = data.workflow ?? [];
  const bhvErgebnis = data.analyse?.bhvErgebnis;
  const offeneKategorien = (bhvErgebnis?.kategorien ?? [])
    .filter((k) => k.stufe === 'unbeantwortet')
    .map((k) => k.titel);

  const empfaengerOptionen = users.filter((u) => (u.rolle === 'spezialist' || u.rolle === 'admin') && u.id !== currentUser.id);
  const wartetAufFreigabe = data.status === 'freigabe angefordert';
  const freigabeAbgelehnt = data.status === 'freigabe abgelehnt';
  const letzteWeiterleitung = [...workflow].reverse().find((e): e is WeiterleitungsEintrag => e.typ === 'weiterleitung');
  const letzteAblehnung = [...workflow].reverse().find((e): e is FreigabeAbgelehntEintrag => e.typ === 'freigabe_abgelehnt');
  // Über eine Freigabe entscheiden darf nur, wer laut Status-Workflow dazu berechtigt ist —
  // nicht der Vorgangs-Eigentümer selbst (sonst könnte man sich die eigene Freigabe erteilen/ablehnen).
  const kannFreigabeErteilen =
    (currentUser.rolle === 'spezialist' || currentUser.rolle === 'admin') && !istEigenerVorgang(currentUser, data);

  const handleWeiterleiten = () => {
    const empfaenger = empfaengerOptionen.find((u) => u.id === empfaengerId);
    if (!empfaenger || !grund.trim()) return;
    const eintrag: WeiterleitungsEintrag = {
      id: `wf-${Date.now()}`,
      typ: 'weiterleitung',
      erstelltAm: new Date().toISOString(),
      erstelltVonId: currentUser.id,
      erstelltVonName: `${currentUser.vorname} ${currentUser.nachname}`,
      empfaengerId: empfaenger.id,
      empfaengerName: `${empfaenger.vorname} ${empfaenger.nachname}`,
      empfaengerRolle: empfaenger.rolle === 'admin' ? 'admin' : 'spezialist',
      grund: grund.trim(),
    };
    onChange({ status: 'freigabe angefordert', workflow: [...workflow, eintrag] });
    setEmpfaengerId('');
    setGrund('');
  };

  const handleFreigabeErteilen = () => {
    const eintrag: FreigabeErteiltEintrag = {
      id: `wf-${Date.now()}`,
      typ: 'freigabe_erteilt',
      erstelltAm: new Date().toISOString(),
      erstelltVonId: currentUser.id,
      erstelltVonName: `${currentUser.vorname} ${currentUser.nachname}`,
    };
    onChange({ status: 'in Prüfung', workflow: [...workflow, eintrag] });
  };

  const handleFreigabeAblehnen = () => {
    if (!ablehnungsGrund.trim()) return;
    const eintrag: FreigabeAbgelehntEintrag = {
      id: `wf-${Date.now()}`,
      typ: 'freigabe_abgelehnt',
      erstelltAm: new Date().toISOString(),
      erstelltVonId: currentUser.id,
      erstelltVonName: `${currentUser.vorname} ${currentUser.nachname}`,
      grund: ablehnungsGrund.trim(),
    };
    onChange({ status: 'freigabe abgelehnt', workflow: [...workflow, eintrag] });
    setAblehnungsGrund('');
  };

  const handleRueckmeldungSenden = () => {
    const eintrag: VertriebsRueckmeldungEintrag = {
      id: `wf-${Date.now()}`,
      typ: 'vertriebsrueckmeldung',
      erstelltAm: new Date().toISOString(),
      erstelltVonId: currentUser.id,
      erstelltVonName: `${currentUser.vorname} ${currentUser.nachname}`,
      offeneKategorien,
      anmerkung: anmerkung.trim(),
    };
    onChange({ status: 'rückmeldung benötigt', workflow: [...workflow, eintrag] });
    setAnmerkung('');
  };

  return (
    <Box sx={{ mt: 3, p: 3, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2.5 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', mb: 0.25 }}>
        Workflow und Freigabe
      </Typography>
      <Typography sx={{ fontSize: '0.78rem', color: '#64748B', mb: 2 }}>
        Vorgang für eine erweiterte Freigabe weiterleiten oder offene Punkte an den Vertrieb zurückmelden.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* An Spezialist/Führungskraft weiterleiten */}
        <Box sx={{ flex: '1 1 280px', p: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <SupervisorAccountOutlinedIcon sx={{ fontSize: 17, color: '#3730A3' }} />
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A' }}>
              An Spezialist / Führungskraft weiterleiten
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.72rem', color: '#64748B', mb: 1.5 }}>
            Für erweiterte Freigaben, z.B. bei hohem Risiko.
          </Typography>

          {wartetAufFreigabe && letzteWeiterleitung ? (
            <>
              <Box sx={{ p: 1.5, bgcolor: '#EAF5EE', border: '1px solid #BFDBFE', borderRadius: 1.5, flex: 1 }}>
                <Typography sx={{ fontSize: '0.76rem', color: '#004A21' }}>
                  Freigabe angefordert bei <strong>{letzteWeiterleitung.empfaengerName}</strong> am {formatDatum(letzteWeiterleitung.erstelltAm)}.
                </Typography>
                <Typography sx={{ fontSize: '0.74rem', color: '#004A21', fontStyle: 'italic', mt: 0.5 }}>
                  „{letzteWeiterleitung.grund}"
                </Typography>
              </Box>
              {kannFreigabeErteilen && (
                <>
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Ablehnungsgrund (Pflichtfeld bei Ablehnung)"
                    value={ablehnungsGrund}
                    onChange={(e) => setAblehnungsGrund(e.target.value)}
                    sx={{ bgcolor: '#fff', mt: 1.5 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="small"
                      onClick={handleFreigabeErteilen}
                    >
                      Freigabe erteilen
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      size="small"
                      disabled={!ablehnungsGrund.trim()}
                      onClick={handleFreigabeAblehnen}
                    >
                      Ablehnen
                    </Button>
                  </Box>
                </>
              )}
            </>
          ) : freigabeAbgelehnt ? (
            <>
              {letzteAblehnung && (
                <Box sx={{ p: 1.5, bgcolor: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 1.5, mb: 1.5 }}>
                  <Typography sx={{ fontSize: '0.76rem', color: '#BE123C' }}>
                    Freigabe abgelehnt von <strong>{letzteAblehnung.erstelltVonName}</strong> am {formatDatum(letzteAblehnung.erstelltAm)}.
                  </Typography>
                  <Typography sx={{ fontSize: '0.74rem', color: '#BE123C', fontStyle: 'italic', mt: 0.5 }}>
                    „{letzteAblehnung.grund}"
                  </Typography>
                </Box>
              )}
              <Typography sx={{ fontSize: '0.74rem', color: '#64748B' }}>
                Der Vorgang muss über den Status oben zuerst zur Überarbeitung zurückgewiesen werden, bevor er erneut zur Freigabe weitergeleitet werden kann.
              </Typography>
            </>
          ) : (
            <>
              <Select
                size="small"
                displayEmpty
                fullWidth
                value={empfaengerId}
                onChange={(e) => setEmpfaengerId(e.target.value)}
                sx={{ bgcolor: '#fff', mb: 1, fontSize: '0.8rem' }}
              >
                <MenuItem value="" disabled>Empfänger auswählen</MenuItem>
                {empfaengerOptionen.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.vorname} {u.nachname} ({u.rolle === 'admin' ? 'Führungskraft' : 'Spezialist'})
                  </MenuItem>
                ))}
              </Select>
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={2}
                placeholder="Grund / Notiz"
                value={grund}
                onChange={(e) => setGrund(e.target.value)}
                sx={{
                  bgcolor: '#fff', mb: 1.5, flex: 1,
                  '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                  '& .MuiInputBase-input': { height: '100% !important', overflow: 'auto' },
                }}
              />
              <Button
                variant="contained"
                fullWidth
                size="small"
                disabled={!empfaengerId || !grund.trim()}
                onClick={handleWeiterleiten}
              >
                Weiterleiten
              </Button>
            </>
          )}
        </Box>

        {/* Rückmeldung an Vertrieb */}
        <Box sx={{ flex: '1 1 280px', p: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <ForwardToInboxOutlinedIcon sx={{ fontSize: 17, color: '#B45309' }} />
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A' }}>
              Rückmeldung an Vertrieb
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.72rem', color: '#64748B', mb: 1.5 }}>
            Automatisch erkannte offene Punkte aus dem Fragebogen.
          </Typography>

          {!bhvErgebnis ? (
            <Typography sx={{ fontSize: '0.76rem', color: '#94A3B8', flex: 1 }}>
              Erst nach der Dokumentenanalyse verfügbar.
            </Typography>
          ) : (
            <>
              {offeneKategorien.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                  {offeneKategorien.map((titel) => (
                    <Chip key={titel} label={titel} size="small" sx={{ fontSize: '0.66rem', bgcolor: '#fff', border: '1px solid #E2E8F0', color: '#64748B' }} />
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: '0.76rem', color: '#15803D', mb: 1.5 }}>
                  Keine offenen Punkte — alle Kategorien beantwortet.
                </Typography>
              )}
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={2}
                placeholder="Zusätzliche Anmerkung"
                value={anmerkung}
                onChange={(e) => setAnmerkung(e.target.value)}
                sx={{
                  bgcolor: '#fff', mb: 1.5, flex: 1,
                  '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                  '& .MuiInputBase-input': { height: '100% !important', overflow: 'auto' },
                }}
              />
              <Button
                variant="contained"
                fullWidth
                size="small"
                disabled={offeneKategorien.length === 0 && !anmerkung.trim()}
                onClick={handleRueckmeldungSenden}
              >
                Rückmeldung senden
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Verlauf */}
      {workflow.length > 0 && (
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #F1F5F9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
            <HistoryOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Verlauf
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {[...workflow].reverse().map((eintrag) => (
              <Box key={eintrag.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{
                  width: 6, height: 6, borderRadius: '50%', mt: 0.7, flexShrink: 0,
                  bgcolor: eintrag.typ === 'weiterleitung' ? '#3730A3'
                    : eintrag.typ === 'freigabe_erteilt' ? '#15803D'
                    : eintrag.typ === 'freigabe_abgelehnt' ? '#BE123C'
                    : '#B45309',
                }} />
                <Typography sx={{ fontSize: '0.76rem', color: '#334155' }}>
                  {eintrag.typ === 'weiterleitung' ? (
                    <>Weitergeleitet an <strong>{eintrag.empfaengerName}</strong> von {eintrag.erstelltVonName} · {formatDatum(eintrag.erstelltAm)}</>
                  ) : eintrag.typ === 'freigabe_erteilt' ? (
                    <>Freigabe erteilt von <strong>{eintrag.erstelltVonName}</strong> · {formatDatum(eintrag.erstelltAm)}</>
                  ) : eintrag.typ === 'freigabe_abgelehnt' ? (
                    <>Freigabe abgelehnt von <strong>{eintrag.erstelltVonName}</strong> · {formatDatum(eintrag.erstelltAm)}
                      {' '}<Box component="span" sx={{ color: '#94A3B8' }}>— „{eintrag.grund}"</Box>
                    </>
                  ) : (
                    <>Rückmeldung an Vertrieb gesendet von {eintrag.erstelltVonName} · {formatDatum(eintrag.erstelltAm)}
                      {' '}<Box component="span" sx={{ color: '#94A3B8' }}>— {eintrag.offeneKategorien.length} offene {eintrag.offeneKategorien.length === 1 ? 'Punkt' : 'Punkte'}</Box>
                    </>
                  )}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

interface Props {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
  onWorkflowChange: (patch: Partial<AntragData>) => void;
  currentUser: AppUser;
  users: AppUser[];
}

const StepAnalyse: React.FC<Props> = ({ data, onChange, onWorkflowChange, currentUser, users }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hochladen, setHochladen] = useState(false);
  const [pruefeLaeuft, setPruefeLaeuft] = useState(false);
  const [sanktionenLaufen, setSanktionenLaufen] = useState(false);
  const [sanktionenFehler, setSanktionenFehler] = useState<string | null>(null);
  const [risikoLaeuft, setRisikoLaeuft] = useState(false);
  const [risikoFehler, setRisikoFehler] = useState<string | null>(null);

  const analyse = data.analyse ?? { dokumente: [] };
  const dokumente = analyse.dokumente;
  const bhvErgebnis = analyse.bhvErgebnis;
  // Die BHV-Dokumentenanalyse wertet stets nur das zuletzt hochgeladene Dokument aus (siehe
  // handleAnalyseStarten) — solange dieses mit dem zuletzt analysierten übereinstimmt, gibt es
  // für diesen Teil nichts Neues auszuwerten.
  const schonAnalysiert = Boolean(
    bhvErgebnis && dokumente.length > 0 && bhvErgebnis.dokumentId === dokumente[dokumente.length - 1].id
  );
  const regelwerk: Regelwerk = analyse.regelwerk ?? 'betriebshaftpflicht';
  const manuelleUeberschreibungen = analyse.manuelleUeberschreibungen ?? [];
  // Für die Gesamteinschätzung zählt die aktuell gültige Stufe je Kategorie —
  // also die manuelle Korrektur, falls vorhanden, sonst die automatische.
  const effektiveKategorien = (bhvErgebnis?.kategorien ?? []).map((k) => {
    const ueberschreibung = manuelleUeberschreibungen.find((u) => u.kategorieId === k.id);
    return ueberschreibung ? { ...k, stufe: ueberschreibung.stufe } : k;
  });
  const automatischeGesamteinschaetzung = bhvErgebnis ? berechneGesamteinschaetzung(effektiveKategorien) : null;
  const gesamtUeberschreibung = analyse.manuelleGesamtUeberschreibung;

  const handleRegelwerkAendern = (wert: Regelwerk) => {
    onChange({ analyse: { ...analyse, regelwerk: wert } });
  };

  const handleKategorieUeberschreiben = (kategorieId: string, stufe: BhvRisikoStufe, kommentar: string) => {
    const eintrag: ManuelleRisikoUeberschreibung = {
      kategorieId,
      stufe,
      kommentar,
      erstelltVonId: currentUser.id,
      erstelltVonName: `${currentUser.vorname} ${currentUser.nachname}`,
      erstelltAm: new Date().toISOString(),
    };
    onChange({
      analyse: {
        ...analyse,
        manuelleUeberschreibungen: [...manuelleUeberschreibungen.filter((u) => u.kategorieId !== kategorieId), eintrag],
      },
    });
  };

  const handleGesamtUeberschreiben = (stufe: BhvRisikoStufe, kommentar: string) => {
    const eintrag: ManuelleRisikoUeberschreibung = {
      kategorieId: 'gesamt',
      stufe,
      kommentar,
      erstelltVonId: currentUser.id,
      erstelltVonName: `${currentUser.vorname} ${currentUser.nachname}`,
      erstelltAm: new Date().toISOString(),
    };
    onChange({ analyse: { ...analyse, manuelleGesamtUeberschreibung: eintrag } });
  };

  const risikoAnalyse = data.risikoAnalyse;

  const { interessent, wagnisanschrift } = data;
  const firmaName = interessent.name.trim();
  const ansprechpartner = interessent.ansprechpartner;
  const sanktionenBereit = firmaName.length >= 3;
  const adresseVollstaendig = istAdresseVollstaendig(wagnisanschrift);
  // Sanktionsprüfung und Standortrisikoanalyse laufen auf diesem Reiter nicht mehr automatisch
  // bei Eingabe, sondern nur noch gebündelt über handleAnalyseStarten — siehe dort.
  const hatEtwasZuPruefen = (dokumente.length > 0 && !schonAnalysiert) || sanktionenBereit || adresseVollstaendig;
  const irgendeinePruefungLaeuft = pruefeLaeuft || sanktionenLaufen || risikoLaeuft;

  const handleDateiAuswahl = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setHochladen(true);
    try {
      const neue: HochgeladenesDokument[] = await Promise.all(
        Array.from(files).map(async (file) => ({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dateiname: file.name,
          groesse: file.size,
          typ: file.type || 'application/octet-stream',
          inhaltBase64: await dateiLesen(file),
          hochgeladenAm: new Date().toISOString(),
        }))
      );
      onChange({ analyse: { ...analyse, dokumente: [...dokumente, ...neue] } });
    } finally {
      setHochladen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDokumentLoeschen = (id: string) => {
    onChange({ analyse: { ...analyse, dokumente: dokumente.filter((d) => d.id !== id) } });
  };

  // Bündelt alle drei Prüfungen dieses Reiters unter einem Button: BHV-Dokumentenanalyse,
  // Sanktionsprüfung und Standortrisikoanalyse laufen erst bei Klick, nicht mehr automatisch
  // bei Eingabe. Jede Teilprüfung läuft nur, wenn dafür etwas Neues vorliegt.
  const handleAnalyseStarten = async () => {
    const aufgaben: Promise<void>[] = [];

    if (dokumente.length > 0 && !schonAnalysiert) {
      setPruefeLaeuft(true);
      const letztesDokument = dokumente[dokumente.length - 1];
      aufgaben.push(
        Promise.all([
          analysiereBhvFragebogen(letztesDokument),
          findeDokumentHinweise(dokumente),
          new Promise((resolve) => setTimeout(resolve, 600)),
        ])
          .then(([bhvErgebnisNeu, hinweiseNeu]) => {
            onChange({ analyse: { ...analyse, bhvErgebnis: bhvErgebnisNeu, hinweise: hinweiseNeu } });
          })
          .finally(() => setPruefeLaeuft(false))
      );
    }

    if (sanktionenBereit) {
      setSanktionenLaufen(true);
      setSanktionenFehler(null);
      aufgaben.push(
        pruefeSanktionen(firmaName, [ansprechpartner])
          .then((result) => { onChange({ sanktionsAnalyse: result }); })
          .catch((e: Error) => { setSanktionenFehler(e.message ?? 'Prüfung fehlgeschlagen'); })
          .finally(() => setSanktionenLaufen(false))
      );
    }

    if (adresseVollstaendig) {
      setRisikoLaeuft(true);
      setRisikoFehler(null);
      aufgaben.push(
        analysiereRisiko(wagnisanschrift)
          .then((result) => { onChange({ risikoAnalyse: result }); })
          .catch((e: Error) => { setRisikoFehler(e.message ?? 'Analyse fehlgeschlagen'); })
          .finally(() => setRisikoLaeuft(false))
      );
    }

    await Promise.all(aufgaben);
  };

  return (
    <Box>
      <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 3 }}>
        Bitte laden Sie ein Dokument zur Prüfung hoch.
      </Typography>

      {/* Regelwerk & Dokumente */}
      <Box sx={{ p: 3, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2.5, mb: 2.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', mb: 1.5 }}>
          Regelwerk
        </Typography>
        <Select
          size="small"
          fullWidth
          value={regelwerk}
          onChange={(e) => handleRegelwerkAendern(e.target.value as Regelwerk)}
          sx={{ maxWidth: 360, fontSize: '0.85rem' }}
        >
          {(Object.keys(REGELWERK_LABELS) as Regelwerk[]).map((r) => (
            <MenuItem key={r} value={r}>{REGELWERK_LABELS[r]}</MenuItem>
          ))}
        </Select>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
            Dokumente
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={hochladen}
          >
            {hochladen ? 'Wird hochgeladen …' : 'Datei hochladen'}
          </Button>
          <input ref={fileInputRef} type="file" multiple hidden onChange={handleDateiAuswahl} />
        </Box>

        {dokumente.length === 0 ? (
          <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 2, textAlign: 'center' }}>
            <Typography sx={{ color: '#94A3B8', fontSize: '0.82rem' }}>
              Noch keine Dokumente hochgeladen.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {dokumente.map((d) => (
              <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <DescriptionOutlinedIcon sx={{ fontSize: 18, color: '#64748B' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.dateiname}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>{formatGroesse(d.groesse)}</Typography>
                </Box>
                <Tooltip title="Entfernen">
                  <IconButton size="small" onClick={() => handleDokumentLoeschen(d.id)} sx={{ color: '#FDA4AF', '&:hover': { color: '#EF4444' } }}>
                    <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Analyse starten — stößt gebündelt BHV-Dokumentenanalyse, Sanktionsprüfung und
          Standortrisikoanalyse an; jede Teilprüfung läuft nur, wenn dafür etwas vorliegt. */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<FactCheckOutlinedIcon />}
          onClick={handleAnalyseStarten}
          disabled={irgendeinePruefungLaeuft || !hatEtwasZuPruefen}
        >
          {irgendeinePruefungLaeuft ? 'Prüfung läuft …' : 'Analyse starten'}
        </Button>
        {!hatEtwasZuPruefen && (
          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 1 }}>
            Bitte mindestens ein Dokument hochladen oder Firmenname bzw. Wagnisanschrift auf Reiter 1 ausfüllen.
          </Typography>
        )}
        {hatEtwasZuPruefen && schonAnalysiert && dokumente.length > 0 && (
          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 1 }}>
            Dokument bereits analysiert. Laden Sie ein weiteres Dokument hoch, um die
            Dokumentenanalyse erneut zu starten.
          </Typography>
        )}
      </Box>

      {/* 1. Versicherungsnehmer — Live-Spiegel aus Reiter 4 */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', mb: 1.5 }}>
          1. Versicherungsnehmer
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', mb: 1.5 }}>
              Sanktionsprüfung
            </Typography>
            <SanktionsPruefPanel data={data} onChange={onChange} autoPruefen={false} />
            {sanktionenFehler && !data.sanktionsAnalyse && (
              <Typography sx={{ fontSize: '0.75rem', color: '#DC2626', mt: 1 }}>
                Fehler: {sanktionenFehler}
              </Typography>
            )}
          </Box>
          <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PublicIcon sx={{ fontSize: 17, color: '#64748B' }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>Standortrisikoanalyse (Naturgefahren)</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {risikoLaeuft
                    ? 'Risikoanalyse wird durchgeführt …'
                    : risikoAnalyse
                      ? `Analysiert am ${new Date(risikoAnalyse.analysiertAm).toLocaleDateString('de-DE')}`
                      : adresseVollstaendig
                        ? (risikoFehler ? `Fehler: ${risikoFehler}` : 'Bereit — mit "Analyse starten" auslösen')
                        : 'Bitte Wagnisanschrift auf Reiter 1 vollständig ausfüllen'}
                </Typography>
              </Box>
              {risikoLaeuft && <CircularProgress size={16} />}
              {!risikoLaeuft && risikoAnalyse && (
                <Chip
                  label={risikoAnalyse.gesamtAmpel === 'rot' ? 'Hoch' : risikoAnalyse.gesamtAmpel === 'gelb' ? 'Mittel' : 'Gering'}
                  size="small"
                  sx={{
                    fontWeight: 700, fontSize: '0.68rem',
                    bgcolor: risikoAnalyse.gesamtAmpel === 'rot' ? '#FEF2F2' : risikoAnalyse.gesamtAmpel === 'gelb' ? '#FFFBEB' : '#F0FDF4',
                    color: risikoAnalyse.gesamtAmpel === 'rot' ? '#DC2626' : risikoAnalyse.gesamtAmpel === 'gelb' ? '#B45309' : '#15803D',
                  }}
                />
              )}
            </Box>
            {risikoAnalyse && risikoAnalyse.gesamtAmpel !== 'unbekannt' && (
              <StandortKarte lat={risikoAnalyse.lat} lon={risikoAnalyse.lon} />
            )}
          </Box>
        </Box>
      </Box>

      {/* Kategorien 2-12 */}
      {bhvErgebnis && (
        <Box>
          <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mb: 2 }}>
            Analyse von: {bhvErgebnis.dokumentName} · {new Date(bhvErgebnis.analysiertAm).toLocaleString('de-DE')}
          </Typography>
          {bhvErgebnis.kategorien.map((k, i) => (
            <KategorieZeile
              key={k.id}
              index={i + 2}
              kategorie={k}
              ueberschreibung={manuelleUeberschreibungen.find((u) => u.kategorieId === k.id)}
              onUeberschreiben={(stufe, kommentar) => handleKategorieUeberschreiben(k.id, stufe, kommentar)}
            />
          ))}

          {automatischeGesamteinschaetzung && (
            <GesamteinschaetzungBox
              automatisch={automatischeGesamteinschaetzung}
              ueberschreibung={gesamtUeberschreibung}
              onUeberschreiben={handleGesamtUeberschreiben}
            />
          )}
        </Box>
      )}

      {pruefeLaeuft && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, color: '#64748B' }}>
          <CircularProgress size={16} />
          <Typography sx={{ fontSize: '0.82rem' }}>Dokument wird ausgewertet …</Typography>
        </Box>
      )}

      <WorkflowSektion data={data} onChange={onWorkflowChange} currentUser={currentUser} users={users} />
    </Box>
  );
};

export default StepAnalyse;
