'use client';

import { useState } from 'react';
import { useAdmin } from '@/components/admin/admin-context';
import { adminFetch, runAction } from '@/components/admin/api';
import { Panel } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';

export function CustomerNotes({ id, initial }: { id: string; initial: string }) {
  const { can } = useAdmin();
  const [notes, setNotes] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const editable = can('customers.manage');
  return (
    <Panel title="Internal notes">
      <label htmlFor="cust-notes" className="sr-only">
        Internal notes
      </label>
      <textarea
        id="cust-notes"
        rows={5}
        value={notes}
        disabled={!editable}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Buys for Year 6, prefers delivery to the school office"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {editable && (
        <Button
          size="sm"
          className="mt-2"
          disabled={notes === saved}
          onClick={async () => {
            if (
              await runAction(
                () => adminFetch(`/api/admin/customers/${id}`, { method: 'PATCH', body: { notes } }),
                { success: 'Notes saved' },
              )
            )
              setSaved(notes);
          }}
        >
          Save notes
        </Button>
      )}
    </Panel>
  );
}
