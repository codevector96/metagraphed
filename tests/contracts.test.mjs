import assert from "node:assert/strict";
import { describe, test } from "vitest";
import {
  API_ROUTES,
  CACHE_SECONDS,
  CONTRACT_VERSION,
  PUBLIC_ARTIFACTS,
  artifactPathFromTemplate,
  buildApiIndexArtifact,
  buildContractsArtifact,
  buildOpenApiArtifact,
  compileRoutePattern,
} from "../src/contracts.mjs";

describe("public contract registry", () => {
  test("keeps API routes and artifacts unique", () => {
    assert.equal(CONTRACT_VERSION, "2026-06-06.1");
    assert.equal(CACHE_SECONDS.short, 60);
    assert.equal(
      new Set(API_ROUTES.map((route) => route.id)).size,
      API_ROUTES.length,
    );
    assert.equal(
      new Set(PUBLIC_ARTIFACTS.map((artifact) => artifact.id)).size,
      PUBLIC_ARTIFACTS.length,
    );
    assert.equal(
      API_ROUTES.every(
        (route) =>
          route.path === "/api/v1" || route.path.startsWith("/api/v1/"),
      ),
      true,
    );
    assert.equal(
      PUBLIC_ARTIFACTS.every((artifact) =>
        artifact.path.startsWith("/metagraph/"),
      ),
      true,
    );
  });

  test("compiles templated route and artifact paths", () => {
    const subnetPattern = compileRoutePattern("/api/v1/subnets/{netuid}");
    const subnetMatch = subnetPattern.exec("/api/v1/subnets/74");
    assert.equal(subnetMatch.groups.netuid, "74");
    assert.equal(subnetPattern.test("/api/v1/subnets/not-a-number"), false);

    const adapterPattern = compileRoutePattern("/api/v1/adapters/{slug}");
    const adapterMatch = adapterPattern.exec("/api/v1/adapters/gittensor");
    assert.equal(adapterMatch.groups.slug, "gittensor");
    assert.equal(adapterPattern.test("/api/v1/adapters/Gittensor"), false);

    assert.equal(
      artifactPathFromTemplate("/metagraph/subnets/{netuid}.json", {
        netuid: 7,
      }),
      "/metagraph/subnets/7.json",
    );
    assert.equal(
      artifactPathFromTemplate("/metagraph/adapters/{slug}.json", {
        slug: "allways",
      }),
      "/metagraph/adapters/allways.json",
    );
  });

  test("builds contracts, API index, and OpenAPI from one route table", () => {
    const generatedAt = "1970-01-01T00:00:00.000Z";
    const contracts = buildContractsArtifact(generatedAt);
    const apiIndex = buildApiIndexArtifact(generatedAt, contracts);
    const openapi = buildOpenApiArtifact(generatedAt);

    assert.equal(contracts.primary_domain, "metagraph.sh");
    assert.equal(contracts.openapi_url, "/metagraph/openapi.json");
    assert.equal(apiIndex.openapi_url, "/api/v1/openapi.json");
    assert.equal(apiIndex.routes.length, API_ROUTES.length);
    assert.equal(openapi.openapi, "3.1.0");
    assert.equal(openapi.info.version, CONTRACT_VERSION);
    assert.equal(Object.keys(openapi.paths).length, API_ROUTES.length);
    assert.equal(Boolean(openapi.components.schemas.SuccessEnvelope), true);
    assert.equal(Boolean(openapi.components.schemas.ErrorEnvelope), true);
    assert.equal(openapi["x-metagraphed"].generated_at, generatedAt);
  });
});
