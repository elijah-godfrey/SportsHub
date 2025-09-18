import { PrismaClient } from '@prisma/client';
import { FootballDataAdapter } from '../adapters/index.js';
import { SoccerJobs } from '../queues/SoccerJobs.js';

export class SportsService {
  private soccerJobs?: SoccerJobs;

  constructor(private prisma: PrismaClient) {}

  /**
   * Initialize all sports and their polling jobs
   */
  async initializeSports() {
    await this.initializeSoccer();
    console.log('✅ Sports initialization complete');
  }

  /**
   * Initialize soccer sport and start polling
   */
  private async initializeSoccer() {
    // Ensure soccer sport exists in database
    const soccer = await this.prisma.sport.upsert({
      where: { key: 'soccer' },
      update: {},
      create: {
        key: 'soccer',
        name: 'Soccer',
      },
    });

    console.log(`✅ Soccer sport initialized (ID: ${soccer.id})`);

    // Initialize soccer polling jobs
    const adapter = new FootballDataAdapter();
    this.soccerJobs = new SoccerJobs(adapter, this.prisma);

    // Schedule jobs
    await this.soccerJobs.scheduleDailyFetch(soccer.id);
    await this.soccerJobs.scheduleLivePolling(soccer.id);

    // Trigger immediate fetch for today's games
    await this.soccerJobs.triggerFetch('daily', soccer.id);

    console.log('✅ Soccer polling jobs scheduled');
  }

  /**
   * Get soccer sport ID (used by API endpoints)
   */
  async getSoccerSportId(): Promise<string> {
    const soccer = await this.prisma.sport.findUnique({
      where: { key: 'soccer' },
    });
    
    if (!soccer) {
      throw new Error('Soccer sport not initialized');
    }
    
    return soccer.id;
  }

  /**
   * Clean shutdown
   */
  async shutdown() {
    if (this.soccerJobs) {
      await this.soccerJobs.close();
    }
  }
}
