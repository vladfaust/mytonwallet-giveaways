import {
  RouteLocationNamedRaw,
  RouteRecordRaw,
  createRouter,
  createWebHistory,
} from "vue-router";
import CheckIn from "./pages/CheckIn.vue";
import Home from "./pages/Home.vue";

export type RouteName = "Home" | "CheckIn";

export function routeLocation(
  args: { name: "Home" } | { name: "CheckIn"; params: { giveawayId: string } }
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
    path: "/g/:giveawayId",
    name: "CheckIn" satisfies RouteName,
    component: CheckIn,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
