// src/app/state/trainer/trainer.store.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TrainerStore, CreateTeamInput } from './trainer.store';

describe('TrainerStore', () => {
  let store: TrainerStore;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TrainerStore]
    }).compileComponents();

    store = TestBed.inject(TrainerStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should load teams successfully', (done) => {
    const mockTrainerId = 'trainer_123';
    const mockTeams = [
      { id: '1', name: 'Test Team', trainer_id: mockTrainerId, pokemon_ids: [25, 6], created_at: '2024-01-01' }
    ];

    store.setCurrentTrainer(mockTrainerId);

    store.loadTeams().subscribe(teams => {
      expect(teams.length).toBe(1);
      expect(teams[0].name).toBe('Test Team');
      expect(teams[0].trainerId).toBe(mockTrainerId);
      done();
    });

    const req = httpMock.expectOne('http://localhost:4000/teams');
    expect(req.request.method).toBe('GET');
    req.flush(mockTeams);
  });

  it('should create a team', (done) => {
    const mockTrainerId = 'trainer_123';
    const newTeam: CreateTeamInput = {
      name: 'New Team',
      trainerId: mockTrainerId,
      pokemonIds: [25, 6],
      pokemonSlots: [],
      competitiveMode: false,
      tier: null
    };

    store.setCurrentTrainer(mockTrainerId);

    // Subscribe to teams to verify optimistic update
    let optimisticReceived = false;
    store.teams$.subscribe(teams => {
      if (!optimisticReceived && teams.length === 1 && teams[0].id?.startsWith('temp_')) {
        optimisticReceived = true;
        expect(teams[0].name).toBe('New Team');
        expect(teams[0].trainerId).toBe(mockTrainerId);
      }
    });

    store.createTeam(newTeam).subscribe(team => {
      expect(team.name).toBe('New Team');
      expect(team.trainerId).toBe(mockTrainerId);
      done();
    });

    const req = httpMock.expectOne('http://localhost:4000/teams');
    expect(req.request.method).toBe('POST');
    req.flush({ id: '123', name: 'New Team', trainer_id: mockTrainerId, pokemon_ids: [25, 6], created_at: new Date().toISOString() });
  });
});