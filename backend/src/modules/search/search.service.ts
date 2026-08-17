import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toFileResponse } from '../files/file.mapper';
import type { FileResponseDto } from '../uploads/dto/upload-response.dto';

const MAX_RESULTS = 50;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filename search across the authenticated user's account.
   *
   * `contains` compiles to ILIKE '%term%'. Prisma parameterises the value,
   * so a term containing quotes cannot break out of the query - but `%` and
   * `_` are still LIKE metacharacters, and left unescaped a search for "_"
   * would match every single-character position. They are escaped below.
   */
  async searchFiles({
    userId,
    query,
  }: {
    userId: string;
    query: string;
  }): Promise<FileResponseDto[]> {
    const term = query.trim();

    if (term.length === 0) {
      return [];
    }

    const files = await this.prisma.file.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
        status: 'READY',
        name: { contains: escapeLikeWildcards(term), mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      // Bounded so a one-character query cannot pull an entire account into
      // memory. The UI tells the user when results were truncated.
      take: MAX_RESULTS,
    });

    return files.map(toFileResponse);
  }
}

/** Neutralises LIKE metacharacters so they match literally. */
function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
