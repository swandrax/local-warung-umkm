import { Elysia, t } from 'elysia';
import { astraDb } from '../db/astra';

export const vectorSearchRoutes = new Elysia({ prefix: '/public/vector-search' })
  /**
   * Semantic / Vector Similarity Search powered by DataStax Astra DB
   * Searches the warung_vectors collection using 1536-dim vector embeddings or text filters.
   */
  .post(
    '/',
    async ({ body, set }) => {
      const { vector, filter, limit = 5 } = body;

      try {
        const coll = astraDb.collection('warung_vectors');

        if (vector && Array.isArray(vector)) {
          // Vector Similarity Search with cosine metric
          const results = await coll
            .find(filter || {}, {
              sort: { $vector: vector },
              limit: Math.min(20, Math.max(1, limit)),
              includeSimilarity: true,
            })
            .toArray();

          return {
            success: true,
            source: 'AstraDB-Vector-Search',
            data: results.map((doc: any) => ({
              id: doc._id,
              name: doc.name,
              category: doc.category,
              city: doc.city,
              specialties: doc.specialties,
              similarityScore: doc.$similarity,
            })),
          };
        }

        // Fallback to metadata / lexical filter if vector embedding is not passed directly
        const results = await coll
          .find(filter || {}, {
            limit: Math.min(20, Math.max(1, limit)),
          })
          .toArray();

        return {
          success: true,
          source: 'AstraDB-Document-Search',
          data: results.map((doc: any) => ({
            id: doc._id,
            name: doc.name,
            category: doc.category,
            city: doc.city,
            specialties: doc.specialties,
          })),
        };
      } catch (err: any) {
        set.status = 500;
        return {
          success: false,
          error: {
            code: 'ASTRA_VECTOR_SEARCH_ERROR',
            message: err.message || 'Failed to query Astra DB vector collection',
          },
        };
      }
    },
    {
      body: t.Object({
        vector: t.Optional(t.Array(t.Number())),
        filter: t.Optional(t.Record(t.String(), t.Any())),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
      }),
    }
  );
