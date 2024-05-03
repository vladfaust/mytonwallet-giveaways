import {
  RouteLocationNamedRaw,
  RouteRecordRaw,
  createRouter,
  createWebHistory,
} from "vue-router";
import CreateGiveaway from "./pages/Giveaways/Create.vue";
import ShowGiveaway from "./pages/Giveaways/Show.vue";
import Home from "./pages/Home.vue";

export type RouteName = "Home" | "CreateGiveaway" | "ShowGiveaway";

export function routeLocation(
  args:
    | { name: "Home" }
    | { name: "CreateGiveaway" }
    | { name: "ShowGiveaway"; params: { giveawayId: string } },
): RouteLocationNamedRaw & { name: RouteName } {
  return args;
}

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home" satisfies RouteName,
    component: Home,
  },
  {
    path: "/giveaways/create",
    name: "CreateGiveaway" satisfies RouteName,
    component: CreateGiveaway,
  },
  {
    path: "/giveaways/:giveawayId",
    name: "ShowGiveaway" satisfies RouteName,
    component: ShowGiveaway,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
