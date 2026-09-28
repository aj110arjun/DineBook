import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import CuisineGrid from "../../components/landing/CuisineGrid.jsx";
import DishSection from "../../components/landing/DishSection.jsx";
import HeroBanner from "../../components/landing/HeroBanner.jsx";
import HowItWorks from "../../components/landing/HowItWorks.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import PromoBanner from "../../components/landing/PromoBanner.jsx";
import RestaurantSection from "../../components/landing/RestaurantSection.jsx";
import Testimonials from "../../components/landing/Testimonials.jsx";
import { signatureDishes, testimonials } from "../../data/landingData.js";
import { requestJson } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";

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
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [restaurantsError, setRestaurantsError] = useState("");
  const [restaurantRefresh, setRestaurantRefresh] = useState(0);
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [toast, setToast] = useState("");

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
        }
      })
      .catch(() => {
        // Not logged in is perfectly valid for the landing page.
        if (mounted) {
          setUser(null);
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
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    setRestaurantsLoading(true);
    setRestaurantsError("");
    requestJson("/api/customer/restaurants")
      .then((items) => {
        if (mounted) {
          setRestaurants(Array.isArray(items) ? items : []);
          setRestaurantsError("");
        }
      })
      .catch((reason) => {
        if (mounted) setRestaurantsError(reason.message);
      })
      .finally(() => {
        if (mounted) setRestaurantsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [restaurantRefresh]);

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

  function notifyReservation(restaurant) {
    setToast(`Table reservations at ${restaurant.name} are coming soon.`);
    window.setTimeout(() => setToast(""), 3600);
  }

  if (loading)
    return (
      <main className="landing-loading">
        <span className="loading-mark">D</span>
        <p>Setting your table…</p>
      </main>
    );

  return (
    <div className="customer-home">
      <CustomerHeader user={user} onLogout={() => setUser(null)} />
      <HeroBanner />
      <main>
        <CuisineGrid selected={selectedCuisine} onSelect={setSelectedCuisine} />
        <RestaurantSection
          id="restaurants-near-you"
          eyebrow="DISCOVER YOUR NEXT TABLE"
          title="Restaurants to Explore"
          restaurants={matchingRestaurants}
          emptyMessage={selectedCuisine ? `No approved ${selectedCuisine} restaurants are available yet. Choose another cuisine to explore.` : "No approved restaurants are available yet."}
          loading={restaurantsLoading}
          error={restaurantsError}
          onRetry={() => setRestaurantRefresh((value) => value + 1)}
          onReserve={notifyReservation}
          actionLabel="Explore Nearby"
          actionHref="#restaurants-near-you"
        />
        <DishSection dishes={signatureDishes} />
        <PromoBanner />
        <HowItWorks />
        <Testimonials testimonials={testimonials} />
      </main>
      <LandingFooter />
      {toast && (
        <div className="landing-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
