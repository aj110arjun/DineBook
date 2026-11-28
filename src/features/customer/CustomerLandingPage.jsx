import LoadingState from "../../components/ui/LoadingState.jsx";
import PageTransition from "../../components/ui/PageTransition.jsx";
import { usePageState } from "../../state/usePageState.js";
import { useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Clock3, MapPin, Utensils } from "lucide-react";
import {
  setCustomerSession,
  clearCustomerSession,
} from "../../state/customerSession.js";
import { useNavigate } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import CuisineGrid from "../../components/landing/CuisineGrid.jsx";
import HeroBanner from "../../components/landing/HeroBanner.jsx";
import HowItWorks from "../../components/landing/HowItWorks.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import RestaurantSection from "../../components/landing/RestaurantSection.jsx";
import CustomerOrderTracker from "../../components/landing/CustomerOrderTracker.jsx";
import { requestJson } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import { customerLandingConfig } from "../../data/customerLandingConfig.js";
import RevealOnScroll from "../../components/landing/RevealOnScroll.jsx";
import "../../assets/css/CustomerLandingPage.css";

const cuisineMatches = {
  Italian: ["italian", "global"],
  Japanese: ["japanese"],
  Indian: ["indian"],
  Mexican: ["mexican"],
  Thai: ["thai"],
  Chinese: ["chinese"],
  Mediterranean: ["mediterranean"],
  Korean: ["korean"],
};

export default function CustomerLandingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [
    {
      user,
      loading,
      restaurants,
      apiCuisines,
      restaurantsLoading,
      restaurantsError,
      restaurantRefresh,
      selectedCuisine,
    },
    {
      user: setUser,
      loading: setLoading,
      restaurants: setRestaurants,
      apiCuisines: setApiCuisines,
      restaurantsLoading: setRestaurantsLoading,
      restaurantsError: setRestaurantsError,
      restaurantRefresh: setRestaurantRefresh,
      selectedCuisine: setSelectedCuisine,
    },
  ] = usePageState("CustomerLandingPage", () => ({
    user: null,
    loading: true,
    restaurants: [],
    apiCuisines: [],
    restaurantsLoading: true,
    restaurantsError: "",
    restaurantRefresh: 0,
    selectedCuisine: "",
  }));
  const isDemoSession =
    import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === "active";

  useEffect(() => {
    let mounted = true;
    if (
      import.meta.env.DEV &&
      sessionStorage.getItem(demoSessionKey) === "active"
    ) {
      setUser(demoCustomer);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    requestJson("/api/customer/me")
      .then((currentUser) => {
        if (mounted) {
          setUser(currentUser);
          dispatch(setCustomerSession(currentUser));
        }
      })
      .catch((reason) => {
        // Not logged in is perfectly valid for the landing page.
        if (mounted) {
          setUser(null);
          if (reason.status === 401 || reason.status === 403)
            dispatch(clearCustomerSession());
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [navigate, dispatch]);

  useEffect(() => {
    let mounted = true;
    setRestaurantsError("");
    requestJson("/api/customer/restaurants?page=1&page_size=100")
      .then((result) => {
        if (mounted) {
          const items = Array.isArray(result) ? result : result?.items;
          setRestaurants(Array.isArray(items) ? items : []);
          setApiCuisines(
            Array.isArray(result?.cuisines) ? result.cuisines : [],
          );
          setRestaurantsError("");
        }
      })
      .catch((reason) => {
        if (mounted) {
          setApiCuisines([]);
          setRestaurantsError(reason.message);
        }
      })
      .finally(() => {
        if (mounted) setRestaurantsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [restaurantRefresh]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setRestaurantRefresh((value) => value + 1),
      30000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const matchingRestaurants = useMemo(() => {
    if (!selectedCuisine) return restaurants;
    const terms = cuisineMatches[selectedCuisine] || [
      selectedCuisine.toLowerCase(),
    ];
    const matches = (restaurant) =>
      terms.some((term) =>
        `${restaurant.cuisine} ${restaurant.name}`.toLowerCase().includes(term),
      );
    return restaurants.filter(matches);
  }, [restaurants, selectedCuisine]);
  const cuisineItems = useMemo(() => {
    if (!apiCuisines.length) return customerLandingConfig.cuisines.items;
    return apiCuisines.map((name) => ({
      name,
      image:
        customerLandingConfig.cuisines.items.find(
          (cuisine) => cuisine.name.toLowerCase() === name.toLowerCase(),
        )?.image || customerLandingConfig.cuisines.fallbackImage,
    }));
  }, [apiCuisines]);
  const featuredRestaurants = useMemo(
    () =>
      [...matchingRestaurants]
        .sort(
          (left, right) =>
            Number(right.rating || 0) - Number(left.rating || 0) ||
            Number(right.review_count || 0) -
              Number(left.review_count || 0),
        )
        .slice(0, customerLandingConfig.featuredRestaurants.limit),
    [matchingRestaurants],
  );
  const featuredRestaurantIds = useMemo(
    () => new Set(featuredRestaurants.map((restaurant) => restaurant.id)),
    [featuredRestaurants],
  );
  const recentlyAddedRestaurants = useMemo(
    () =>
      [...matchingRestaurants]
        .sort(
          (left, right) =>
            new Date(right.created_at || 0) -
            new Date(left.created_at || 0),
        )
        .filter((restaurant) => !featuredRestaurantIds.has(restaurant.id))
        .slice(0, customerLandingConfig.recentRestaurants.limit),
    [featuredRestaurantIds, matchingRestaurants],
  );

  function selectCuisine(cuisine) {
    setSelectedCuisine((current) => (current === cuisine ? "" : cuisine));
    window.requestAnimationFrame(() => {
      document
        .getElementById("restaurants-near-you")
        ?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        });
    });
  }

  if (loading)
    return (
      <PageTransition as="main" className="landing-loading">
        <LoadingState variant="cards" count={4} label="Setting your table…" />
      </PageTransition>
    );

  return (
    <div className="customer-home customer-landing">
      <CustomerHeader user={user} onLogout={() => setUser(null)} />
      <HeroBanner config={customerLandingConfig.hero} />
      <CustomerOrderTracker enabled={Boolean(user) && !isDemoSession} />
      <PageTransition as="main">
        <CuisineGrid
          selected={selectedCuisine}
          onSelect={selectCuisine}
          config={{ ...customerLandingConfig.cuisines, items: cuisineItems }}
        />
        <section className="landing-highlights" aria-label="DineBook benefits">
          {customerLandingConfig.highlights.map(({ title, description }, index) => {
            const Icon = [MapPin, Clock3, Utensils][index % 3];
            return (
              <RevealOnScroll
                as="article"
                className="landing-highlight"
                key={title}
                delay={index * 80}
              >
                <span className="landing-highlight-icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </RevealOnScroll>
            );
          })}
        </section>
        <RestaurantSection
          id="restaurants-near-you"
          eyebrow={customerLandingConfig.featuredRestaurants.eyebrow}
          title={
            matchingRestaurants.some((restaurant) => restaurant.rating != null)
              ? customerLandingConfig.featuredRestaurants.title
              : "Restaurants to discover"
          }
          restaurants={featuredRestaurants}
          emptyMessage={
            selectedCuisine
              ? `No approved ${selectedCuisine} restaurants are available yet. Choose another cuisine to explore.`
              : customerLandingConfig.featuredRestaurants.emptyMessage
          }
          emptyTitle={customerLandingConfig.featuredRestaurants.emptyTitle}
          loading={restaurantsLoading}
          error={restaurantsError}
          onRetry={() => setRestaurantRefresh((value) => value + 1)}
          actionLabel={customerLandingConfig.featuredRestaurants.actionLabel}
          actionHref={customerLandingConfig.featuredRestaurants.actionHref}
        />
        {recentlyAddedRestaurants.length > 0 && (
          <RestaurantSection
            id="recently-added"
            eyebrow={customerLandingConfig.recentRestaurants.eyebrow}
            title={customerLandingConfig.recentRestaurants.title}
            restaurants={recentlyAddedRestaurants}
            loading={restaurantsLoading}
            error={restaurantsError}
            onRetry={() => setRestaurantRefresh((value) => value + 1)}
            actionLabel={customerLandingConfig.recentRestaurants.actionLabel}
            actionHref={customerLandingConfig.recentRestaurants.actionHref}
          />
        )}
        <HowItWorks />
      </PageTransition>
      <LandingFooter />
    </div>
  );
}
