import { getActiveWorldAgents } from "@/lib/world/agents";
import { getWorldEvent } from "@/lib/world/events";
import { createWorldPost, getWorldPosts } from "@/lib/world/posts";
import { createWorldForecast } from "@/lib/world/forecasts";
import { reasonAboutWorldEvent } from "@/lib/world/agent-reasoning";
import { generateWorldScenarios } from "@/lib/world/scenario-engine";

export type WorldRunResult = {
  eventId: string;
  agentCount: number;
  postCount: number;
  forecastCount: number;
};

export async function runWorldSimulation(
  eventId: string,
  rounds = 2
): Promise<WorldRunResult> {
  const event = await getWorldEvent(eventId);

  if (!event) {
    throw new Error(`World event not found: ${eventId}`);
  }

  const agents = await getActiveWorldAgents();

  if (agents.length === 0) {
    throw new Error("No active world agents found");
  }

  let allPosts = await getWorldPosts(eventId, 500);
  let postCount = 0;

  for (let round = 1; round <= rounds; round += 1) {
    const previousRoundPosts =
      round > 1
        ? allPosts.filter((post) => post.round === round - 1)
        : [];

    const currentRoundPosts = [];

    for (const agent of agents) {
      const reasoning = await reasonAboutWorldEvent({
        agent,
        event,
        previousPosts: previousRoundPosts,
      });

      let parentPostId: string | null = null;

      if (previousRoundPosts.length > 0) {
        const relatedParent = previousRoundPosts.find(
          (post) => post.agent_id === agent.id
        );

        parentPostId =
          relatedParent?.id ??
          previousRoundPosts[
            currentRoundPosts.length % previousRoundPosts.length
          ]?.id ??
          null;
      }

      const post = await createWorldPost({
        eventId,
        agentId: agent.id,
        parentPostId,
        round,
        content: reasoning.content,
        stance: reasoning.stance,
        reasoningSummary: reasoning.reasoningSummary,
        metadata: {
          engine: "world-engine-v2",
          generated: true,
          signalsToWatch: reasoning.signalsToWatch,
          likelyEffects: reasoning.likelyEffects,
          agentSlug: agent.slug,
          agentRole: agent.role,
        },
      });

      currentRoundPosts.push(post);
      postCount += 1;
    }

    allPosts = [...allPosts, ...currentRoundPosts];
  }

  const scenarios = await generateWorldScenarios({
    event,
    agents,
    posts: allPosts.filter((post) => post.round <= rounds),
  });

  for (const scenario of scenarios) {
    await createWorldForecast({
      eventId,
      scenario: scenario.scenario,
      timeHorizon: scenario.timeHorizon,
      probabilityBand: scenario.probabilityBand,
      drivers: scenario.drivers,
      risks: scenario.risks,
      affectedIndustries: scenario.affectedIndustries,
      affectedEntities: scenario.affectedEntities,
      metadata: {
        engine: "world-engine-v3",
        generated: true,
        agentCount: agents.length,
        rounds,
        postCount,
      },
    });
  }

  return {
    eventId,
    agentCount: agents.length,
    postCount,
    forecastCount: scenarios.length,
  };
}
