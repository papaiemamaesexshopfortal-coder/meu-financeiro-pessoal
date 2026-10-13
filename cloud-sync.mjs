// Optimistic concurrency: never overwrite a different device's revision.
export class FinanceSync {
  constructor(client, userId, storage, key) {
    this.client = client; this.userId = userId; this.storage = storage; this.key = key;
    this.revision = storage.getItem(key + ':revision');
    this.pending = storage.getItem(key + ':pending') === 'true';
    this.stopped = false;
  }
  async load(local) {
    const { data, error } = await this.client.from('user_finance_data').select('data,updated_at').eq('user_id', this.userId).maybeSingle();
    if (error) throw new Error('OFFLINE');
    if (this.stopped) throw new Error('SESSION_CHANGED');
    if (this.pending) {
      if ((data?.updated_at || null) !== this.revision) throw new Error('SYNC_CONFLICT');
      return local;
    }
    this.revision = data?.updated_at || null;
    this.storeRevision();
    return data?.data || local;
  }
  storeRevision() {
    if (this.revision) this.storage.setItem(this.key + ':revision', this.revision);
    else this.storage.removeItem(this.key + ':revision');
  }
  markPending() { this.pending = true; this.storage.setItem(this.key + ':pending', 'true'); }
  async save(snapshot) {
    if (this.stopped) return;
    const revision = new Date().toISOString();
    const row = { user_id: this.userId, data: snapshot, updated_at: revision };
    const table = this.client.from('user_finance_data');
    const query = this.revision ? table.update(row).eq('user_id', this.userId).eq('updated_at', this.revision) : table.insert(row);
    const { data, error } = await query.select('updated_at').maybeSingle();
    if (this.stopped) return;
    if (error?.code === '23505' || (!error && !data)) throw new Error('SYNC_CONFLICT');
    if (error) throw new Error('OFFLINE');
    this.revision = data.updated_at;
    this.storeRevision();
  }
  acknowledge() { this.pending = false; this.storage.removeItem(this.key + ':pending'); }
  stop() { this.stopped = true; }
}
