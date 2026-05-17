import { PageShell } from '../../../shared/layouts/PageShell'
import { RevealCard } from '../components/RevealCard'

export function RoleRevealPage() {
  return (
    <PageShell compact>
      <div className="py-8">
        <RevealCard />
      </div>
    </PageShell>
  )
}
