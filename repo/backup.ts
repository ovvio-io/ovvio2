import { Repository, RepoStorage } from './repo.ts';

export class IndexedDbRepoBackup<ST extends RepoStorage<ST>> {
  private readonly _repo: Repository<ST>;
  constructor(repo: Repository<ST>) {
    this._repo = repo;
  }
}
