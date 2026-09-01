import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, Chip, CircularProgress, Select, MenuItem, TextField } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import PublicIcon from '@mui/icons-material/Public';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import ForwardToInboxOutlinedIcon from '@mui/icons-material/ForwardToInboxOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import type { AntragData, BhvRisikoStufe, HochgeladenesDokument, WeiterleitungsEintrag, VertriebsRueckmeldungEintrag } from '../../types/antrag';
import type { AppUser } from '../../types/user';
import { analysiereBhvFragebogen } from '../../utils/bhvAnalyse';
import { findeDokumentHinweise } from '../../utils/dokumentHinweise';
import { pruefeSanktionen } from '../../utils/sanktionsAnalyse';
import { analysiereRisiko } from '../../utils/risikoAnalyse';

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

const NATURGEFAHR_LABELS: Record<string, string> = {
  hochwasser: 'Hochwasser / Überschwemmung',
  sturm: 'Sturm / Orkan',
  erdbeben: 'Erdbeben',
  hagel: 'Hagel',
  waldbrand: 'Waldbrand',
  schnee: 'Schnee- / Eislast',
};

const UMWELTRISIKO_LABELS: Record<string, string> = {
  luftemissionen: 'Luftemissionen',
  gewaesserBoden: 'Gewässer- und Bodenkontamination',
  abfall: 'Abfall- und Sondermüllaufkommen',
  laerm: 'Lärmemissionen',
  brandExplosion: 'Brand- und Explosionsrisiko',
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

interface WorkflowProps {
  data: AntragData;
  onChange: (patch: Partial<AntragData>) => void;
  currentUser: AppUser;
  users: AppUser[];
}

const WorkflowSektion: React.FC<WorkflowProps> = ({ data, onChange, currentUser, users }) => {
  const [empfaengerId, setEmpfaengerId] = useState('');
  const [grund, setGrund] = useState('');
  const [anmerkung, setAnmerkung] = useState('');

  const workflow = data.workflow ?? [];
  const bhvErgebnis = data.analyse?.bhvErgebnis;
  const offeneKategorien = (bhvErgebnis?.kategorien ?? [])
    .filter((k) => k.stufe === 'unbeantwortet')
    .map((k) => k.titel);

  const empfaengerOptionen = users.filter((u) => (u.rolle === 'spezialist' || u.rolle === 'admin') && u.id !== currentUser.id);
  const wartetAufFreigabe = data.status === 'freigabe angefordert';
  const letzteWeiterleitung = [...workflow].reverse().find((e): e is WeiterleitungsEintrag => e.typ === 'weiterleitung');

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
            <Box sx={{ p: 1.5, bgcolor: '#EAF5EE', border: '1px solid #BFDBFE', borderRadius: 1.5, flex: 1 }}>
              <Typography sx={{ fontSize: '0.76rem', color: '#004A21' }}>
                Freigabe angefordert bei <strong>{letzteWeiterleitung.empfaengerName}</strong> am {formatDatum(letzteWeiterleitung.erstelltAm)}.
              </Typography>
              <Typography sx={{ fontSize: '0.74rem', color: '#004A21', fontStyle: 'italic', mt: 0.5 }}>
                „{letzteWeiterleitung.grund}"
              </Typography>
            </Box>
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
                  bgcolor: eintrag.typ === 'weiterleitung' ? '#3730A3' : '#B45309',
                }} />
                <Typography sx={{ fontSize: '0.76rem', color: '#334155' }}>
                  {eintrag.typ === 'weiterleitung' ? (
                    <>Weitergeleitet an <strong>{eintrag.empfaengerName}</strong> von {eintrag.erstelltVonName} · {formatDatum(eintrag.erstelltAm)}</>
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
  currentUser: AppUser;
  users: AppUser[];
}

const StepAnalyse: React.FC<Props> = ({ data, onChange, currentUser, users }) => {
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
  const hinweise = analyse.hinweise ?? [];

  const sanktionsAnalyse = data.sanktionsAnalyse;
  const risikoAnalyse = data.risikoAnalyse;

  const { interessent, wagnisanschrift } = data;
  const firmaName = interessent.name.trim();
  const ansprechpartner = interessent.ansprechpartner;
  const sanktionenBereit = firmaName.length >= 3;
  const adresseVollstaendig = istAdresseVollstaendig(wagnisanschrift);
  const sanktionsKey = JSON.stringify([firmaName, ansprechpartner.vorname, ansprechpartner.name]);
  const adresseKey = JSON.stringify([wagnisanschrift.strasse, wagnisanschrift.hausnummer, wagnisanschrift.plz, wagnisanschrift.ort, wagnisanschrift.land]);
  // Bei erneutem Mounten (z.B. Tab-Wechsel) nicht sofort neu abfragen, wenn für die
  // aktuellen Eingaben bereits ein Ergebnis vorliegt — sonst würde jeder Tab-Wechsel
  // eine überflüssige Neuabfrage der externen APIs auslösen.
  const letzterSanktionsKeyRef = useRef<string>(sanktionsAnalyse ? sanktionsKey : '');
  const letzteAdresseRef = useRef<string>(risikoAnalyse ? adresseKey : '');

  // Sanktionsprüfung und Standortrisikoanalyse sollen unabhängig davon vorliegen,
  // ob Reiter 4 bereits besucht wurde — daher hier dieselbe Trigger-Logik wie in
  // SanktionsPruefPanel/RisikoAnalysePanel, statt nur den bestehenden Stand zu spiegeln.
  useEffect(() => {
    if (!sanktionenBereit) return;
    const key = JSON.stringify([firmaName, ansprechpartner.vorname, ansprechpartner.name]);
    if (key === letzterSanktionsKeyRef.current) return;

    setSanktionenLaufen(true);
    setSanktionenFehler(null);
    let aborted = false;

    const debounce = setTimeout(() => {
      letzterSanktionsKeyRef.current = key;
      pruefeSanktionen(firmaName, [ansprechpartner])
        .then((result) => { if (!aborted) onChange({ sanktionsAnalyse: result }); })
        .catch((e: Error) => {
          if (!aborted) {
            letzterSanktionsKeyRef.current = '';
            setSanktionenFehler(e.message ?? 'Prüfung fehlgeschlagen');
          }
        })
        .finally(() => { if (!aborted) setSanktionenLaufen(false); });
    }, 800);

    return () => {
      clearTimeout(debounce);
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaName, ansprechpartner.vorname, ansprechpartner.name]);

  useEffect(() => {
    if (!adresseVollstaendig) return;
    const key = JSON.stringify([wagnisanschrift.strasse, wagnisanschrift.hausnummer, wagnisanschrift.plz, wagnisanschrift.ort, wagnisanschrift.land]);
    if (key === letzteAdresseRef.current) return;

    setRisikoLaeuft(true);
    setRisikoFehler(null);
    let aborted = false;

    const debounce = setTimeout(() => {
      letzteAdresseRef.current = key;
      analysiereRisiko(wagnisanschrift)
        .then((result) => { if (!aborted) onChange({ risikoAnalyse: result }); })
        .catch((e: Error) => {
          if (!aborted) {
            letzteAdresseRef.current = '';
            setRisikoFehler(e.message ?? 'Analyse fehlgeschlagen');
          }
        })
        .finally(() => { if (!aborted) setRisikoLaeuft(false); });
    }, 800);

    return () => {
      clearTimeout(debounce);
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wagnisanschrift.strasse, wagnisanschrift.hausnummer, wagnisanschrift.plz, wagnisanschrift.ort, wagnisanschrift.land]);

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

  const handleAnalyseStarten = async () => {
    if (dokumente.length === 0) return;
    setPruefeLaeuft(true);
    try {
      const letztesDokument = dokumente[dokumente.length - 1];
      const [bhvErgebnisNeu, hinweiseNeu] = await Promise.all([
        analysiereBhvFragebogen(letztesDokument),
        findeDokumentHinweise(dokumente),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
      onChange({ analyse: { ...analyse, bhvErgebnis: bhvErgebnisNeu, hinweise: hinweiseNeu } });
    } finally {
      setPruefeLaeuft(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 3 }}>
        Laden Sie den ausgefüllten Kurzfragebogen zum Betriebs- und Produkthaftpflichtrisiko hoch.
        Nach der Analyse wird zu jeder Kategorie eine Risikoeinschätzung angezeigt.
      </Typography>

      {/* Dokumente */}
      <Box sx={{ p: 3, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2.5, mb: 2.5 }}>
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

      {/* Analyse starten */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<FactCheckOutlinedIcon />}
          onClick={handleAnalyseStarten}
          disabled={dokumente.length === 0 || pruefeLaeuft}
        >
          {pruefeLaeuft ? 'Prüfung läuft …' : 'Analyse starten'}
        </Button>
        {dokumente.length === 0 && (
          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 1 }}>
            Bitte mindestens ein Dokument hochladen.
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <GavelIcon sx={{ fontSize: 17, color: '#64748B' }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>Sanktionsprüfung</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {sanktionenLaufen
                    ? 'UN Security Council Consolidated List wird abgefragt …'
                    : sanktionsAnalyse
                      ? `Geprüft am ${new Date(sanktionsAnalyse.geprueftAm).toLocaleDateString('de-DE')}`
                      : sanktionenBereit
                        ? (sanktionenFehler ? `Fehler: ${sanktionenFehler}` : 'Prüfung wird gestartet …')
                        : 'Bitte Firmenname auf Reiter 1 eintragen'}
                </Typography>
              </Box>
              {sanktionenLaufen && <CircularProgress size={16} />}
              {!sanktionenLaufen && sanktionsAnalyse && (
                <Chip
                  label={sanktionsAnalyse.ampel === 'rot' ? 'Sanktionstreffer' : sanktionsAnalyse.ampel === 'gruen' ? 'Keine Treffer' : 'Unvollständig'}
                  size="small"
                  sx={{
                    fontWeight: 700, fontSize: '0.68rem',
                    bgcolor: sanktionsAnalyse.ampel === 'rot' ? '#FEF2F2' : sanktionsAnalyse.ampel === 'gruen' ? '#F0FDF4' : '#F8FAFC',
                    color: sanktionsAnalyse.ampel === 'rot' ? '#DC2626' : sanktionsAnalyse.ampel === 'gruen' ? '#15803D' : '#64748B',
                  }}
                />
              )}
            </Box>
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
                        ? (risikoFehler ? `Fehler: ${risikoFehler}` : 'Analyse wird gestartet …')
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
            {risikoAnalyse && <StandortKarte lat={risikoAnalyse.lat} lon={risikoAnalyse.lon} />}
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
            <Box key={k.id} sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', mb: 1 }}>
                {i + 2}. {k.titel}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>{k.begruendung}</Typography>
                </Box>
                <StufeChip stufe={k.stufe} />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {pruefeLaeuft && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, color: '#64748B' }}>
          <CircularProgress size={16} />
          <Typography sx={{ fontSize: '0.82rem' }}>Dokument wird ausgewertet …</Typography>
        </Box>
      )}

      <WorkflowSektion data={data} onChange={onChange} currentUser={currentUser} users={users} />

      {/* Hinweise auf Naturgefahren/Umweltrisiken aus Dokumenten (für Reiter 4) */}
      {bhvErgebnis && hinweise.length > 0 && (
        <Box sx={{ mt: 2.5, p: 3, bgcolor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: '#C2410C' }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#9A3412' }}>
              Hinweise aus Dokumenten erkannt
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.78rem', color: '#9A3412', mb: 2 }}>
            Diese Hinweise wurden in den hochgeladenen Dokumenten gefunden und automatisch in Reiter 4
            (Risikocheck) unter "Naturgefahren am Standort" bzw. "Umweltrisiko durch Geschäftstätigkeit"
            übernommen — inklusive Quellenangabe.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {hinweise.map((h, i) => (
              <Box key={i} sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #FED7AA', borderRadius: 2 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                  {h.bereich === 'naturgefahr' ? NATURGEFAHR_LABELS[h.kategorie] : UMWELTRISIKO_LABELS[h.kategorie]}
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', mt: 0.25 }}>
                  „{h.ausschnitt}"
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mt: 0.5 }}>
                  Quelle: {h.quelle}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default StepAnalyse;
