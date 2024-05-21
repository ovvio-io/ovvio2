import { MemRepoStorage, Repository } from '../repo/repo.ts';

export type OrgRepositories = Map<string, Repository<MemRepoStorage>>;
