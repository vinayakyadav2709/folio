import { AwardIcon, BriefcaseIcon, LayersIcon, PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { arrayMove } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/page-header'
import { EMPTY_ACH, EMPTY_EXP, type MediaMap, type ProfileForm } from '../lib/use-profile-form'
import {
  EntryCard,
  EntryFooter,
  MicroField,
  PoolBody,
  PoolEmpty,
  RemoveEntry,
  SectionRule,
} from './entry-card'
import { EntryMedia } from './entry-media'
import { SaveBar } from './settings-panel'

// The profile pool as full dashboard pages (the Projects/Resumes grammar: page
// header with actions, then a measure-capped body) rather than settings panels.
// Entry structure lives in ./entry-card, shared with the Education section that
// stays inside Settings.

function PoolPage({
  title,
  addLabel,
  onAdd,
  form,
  section,
  children,
}: {
  title: string
  addLabel: string
  onAdd: () => void
  form: ProfileForm
  section: keyof ProfileForm['sections']
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        actions={
          <Button className="active:scale-[0.96]" onClick={onAdd}>
            <PlusIcon /> {addLabel}
          </Button>
        }
      />
      {children}
      <SaveBar section={form.sections[section]} />
    </div>
  )
}

export function ExperiencePage({ form, media }: { form: ProfileForm; media: MediaMap }) {
  const { fields, setExperience } = form
  const rows = fields.experience
  const setExp = (i: number, patch: Partial<(typeof rows)[number]>) =>
    setExperience((all) => all.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setExperience((all) => [...all, { ...EMPTY_EXP }])

  return (
    <PoolPage
      title="Experience"
      addLabel="Add experience"
      onAdd={addRow}
      form={form}
      section="experience"
    >
      {rows.length === 0 ? (
        <PoolEmpty
          icon={BriefcaseIcon}
          title="No roles yet."
          description="Add the jobs you want on your resumes. Each role carries its own dates, location and highlight bullets — blocks pull straight from here."
          action="Add your first role"
          onAction={addRow}
        />
      ) : (
        <PoolBody>
          <SectionRule label="Roles" count={rows.length} />
          {rows.map((row, i) => (
            <EntryCard
              key={i}
              index={i}
              removeLabel="Remove experience entry"
              total={rows.length}
              onMove={(to) => setExperience((all) => arrayMove(all, i, to))}
              onRemove={() => setExperience((all) => all.filter((_, idx) => idx !== i))}
              rail={
                <>
                  <div className="@3xl:grid-cols-1 grid grid-cols-2 gap-2.5">
                    <MicroField label="Start">
                      <Input
                        value={row.startDate}
                        onChange={(e) => setExp(i, { startDate: e.target.value })}
                        placeholder="Jan 2023"
                        className="font-mono tabular-nums"
                      />
                    </MicroField>
                    <MicroField label="End">
                      <Input
                        value={row.endDate}
                        onChange={(e) => setExp(i, { endDate: e.target.value })}
                        placeholder="Present"
                        className="font-mono tabular-nums"
                      />
                    </MicroField>
                  </div>
                  <MicroField label="Location">
                    <Input
                      value={row.location}
                      onChange={(e) => setExp(i, { location: e.target.value })}
                      placeholder="Berlin, DE"
                    />
                  </MicroField>
                </>
              }
            >
              <div className="@xl:grid-cols-2 grid gap-3 pr-8">
                <MicroField label="Company">
                  <Input
                    value={row.company}
                    onChange={(e) => setExp(i, { company: e.target.value })}
                    placeholder="Acme Inc."
                  />
                </MicroField>
                <MicroField label="Role">
                  <Input
                    value={row.role}
                    onChange={(e) => setExp(i, { role: e.target.value })}
                    placeholder="Senior Backend Engineer"
                  />
                </MicroField>
              </div>
              <MicroField label="Highlights" hint="One bullet per line.">
                <Textarea
                  value={row.bulletsText}
                  onChange={(e) => setExp(i, { bulletsText: e.target.value })}
                  placeholder={'Cut p99 latency 40% by…\nLed migration of…'}
                  rows={4}
                />
              </MicroField>
              <EntryFooter
                label="Media"
                hint="Offer letters, references or screenshots — images or PDF, up to 5 MB each."
              >
                <EntryMedia
                  ids={row.mediaIds}
                  media={media}
                  onChange={(mediaIds) => setExp(i, { mediaIds })}
                />
              </EntryFooter>
            </EntryCard>
          ))}
        </PoolBody>
      )}
    </PoolPage>
  )
}

const parseItems = (text: string) =>
  text
    .split(',')
    .map((i) => i.trim())
    .filter(Boolean)

export function SkillsPage({ form }: { form: ProfileForm }) {
  const { fields, setSkills } = form
  const rows = fields.skills
  const setRow = (i: number, patch: Partial<(typeof rows)[number]>) =>
    setSkills((all) => all.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setSkills((all) => [...all, { category: '', itemsText: '' }])

  return (
    <PoolPage
      title="Skills"
      addLabel="Add category"
      onAdd={addRow}
      form={form}
      section="skills"
    >
      {rows.length === 0 ? (
        <PoolEmpty
          icon={LayersIcon}
          title="No skill categories yet."
          description="Group what you know — languages, infrastructure, tooling — and resumes will render each group as its own line."
          action="Add your first category"
          onAction={addRow}
        />
      ) : (
        <PoolBody>
          <SectionRule label="Categories" count={rows.length} />
          <div className="@3xl:grid-cols-2 grid gap-4">
            {rows.map((row, i) => {
              const items = parseItems(row.itemsText)
              return (
                <article
                  key={i}
                  style={{ animationDelay: `${Math.min(i, 4) * 45}ms` }}
                  className="group/entry relative flex animate-entry flex-col gap-4 rounded-2xl border border-border/60 bg-card/30 p-5 transition-colors duration-200 hover:border-foreground/20"
                >
                  <div className="flex items-start gap-3 pr-9">
                    <MicroField label="Category" className="flex-1">
                      <Input
                        value={row.category}
                        onChange={(e) => setRow(i, { category: e.target.value })}
                        placeholder="Languages"
                      />
                    </MicroField>
                    <span className="shrink-0 pt-6 font-mono text-[10px] text-muted-foreground/60 uppercase tabular-nums tracking-[0.3em]">
                      {String(items.length).padStart(2, '0')}
                    </span>
                  </div>
                  <MicroField label="Items" hint="Comma-separated.">
                    <Input
                      value={row.itemsText}
                      onChange={(e) => setRow(i, { itemsText: e.target.value })}
                      placeholder="TypeScript, Rust, Go"
                    />
                  </MicroField>
                  {items.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1.5 border-border/50 border-t pt-4">
                      {items.map((item, idx) => (
                        <Badge
                          key={`${item}-${idx}`}
                          variant="outline"
                          size="lg"
                          className="px-2 font-normal"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <RemoveEntry
                    label="Remove category"
                    onClick={() => setSkills((all) => all.filter((_, idx) => idx !== i))}
                  />
                </article>
              )
            })}
          </div>
        </PoolBody>
      )}
    </PoolPage>
  )
}

export function AchievementsPage({ form, media }: { form: ProfileForm; media: MediaMap }) {
  const { fields, setAchievements } = form
  const rows = fields.achievements
  const setAch = (i: number, patch: Partial<(typeof rows)[number]>) =>
    setAchievements((all) => all.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setAchievements((all) => [...all, { ...EMPTY_ACH }])

  return (
    <PoolPage
      title="Achievements"
      addLabel="Add achievement"
      onAdd={addRow}
      form={form}
      section="achievements"
    >
      {rows.length === 0 ? (
        <PoolEmpty
          icon={AwardIcon}
          title="No achievements yet."
          description="Awards, certifications and publications — attach the certificate and it travels with the entry into your resumes."
          action="Add your first achievement"
          onAction={addRow}
        />
      ) : (
        <PoolBody>
          <SectionRule label="Entries" count={rows.length} />
          {rows.map((row, i) => (
            <EntryCard
              key={i}
              index={i}
              removeLabel="Remove achievement entry"
              total={rows.length}
              onMove={(to) => setAchievements((all) => arrayMove(all, i, to))}
              onRemove={() => setAchievements((all) => all.filter((_, idx) => idx !== i))}
              rail={
                <MicroField label="Date">
                  <Input
                    value={row.date}
                    onChange={(e) => setAch(i, { date: e.target.value })}
                    placeholder="Mar 2024"
                    className="font-mono tabular-nums"
                  />
                </MicroField>
              }
            >
              <MicroField label="Title" className="pr-8">
                <Input
                  value={row.title}
                  onChange={(e) => setAch(i, { title: e.target.value })}
                  placeholder="AWS Solutions Architect"
                />
              </MicroField>
              <MicroField label="Description">
                <Textarea
                  value={row.description}
                  onChange={(e) => setAch(i, { description: e.target.value })}
                  placeholder="What it was and why it mattered."
                  rows={3}
                />
              </MicroField>
              <EntryFooter
                label="Media"
                hint="Certificates, photos or screenshots — images or PDF, up to 5 MB each."
              >
                <EntryMedia
                  ids={row.mediaIds}
                  media={media}
                  onChange={(mediaIds) => setAch(i, { mediaIds })}
                />
              </EntryFooter>
            </EntryCard>
          ))}
        </PoolBody>
      )}
    </PoolPage>
  )
}
