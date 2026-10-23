import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Utensils } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ChefLayout from "../../components/chef/ChefLayout.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function ChefMenuPage() {
  const { foodId } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    requestJson("/api/chef/menu")
      .then((data) => { if (active) { setCategories(data || []); setError(""); } })
      .catch((reason) => active && setError(reason.message || "Unable to load the restaurant menu."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const foods = useMemo(() => categories.flatMap((category) => (category.foods || []).map((food) => ({ ...food, category_id: category.id, category_name: category.name }))), [categories]);
  const selectedFood = foods.find((food) => String(food.id) === foodId);
  const visibleCategories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories.map((category) => ({
      ...category,
      foods: (category.foods || []).filter((food) =>
        (categoryFilter === "ALL" || category.id === categoryFilter)
        && (!needle || `${food.name} ${food.description || ""} ${category.name}`.toLowerCase().includes(needle)),
      ),
    })).filter((category) => category.foods.length > 0);
  }, [categories, query, categoryFilter]);

  return <ChefLayout title={foodId ? selectedFood?.name || "Menu item" : "Menu"}>
    <main className="chef-menu-page">
      <header className="chef-menu-page-heading">
        <div><span>RESTAURANT MENU</span><h2>{foodId ? selectedFood?.name || "Menu item" : "Menu listing"}</h2><p>{foodId ? "Food item details and availability" : `${foods.length} food item${foods.length === 1 ? "" : "s"} across ${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}</p></div>
        {foodId && <button type="button" onClick={() => navigate("/chef/menu")}><ArrowLeft size={16} /> Back to menu</button>}
      </header>
      {error && <div className="chef-menu-page-message" role="alert">{error}<button type="button" onClick={() => window.location.reload()}>Try again</button></div>}
      {loading ? <p className="chef-menu-page-message" role="status">Loading menu…</p> : foodId ? (
        !selectedFood ? <div className="chef-menu-page-message">This food item could not be found in the active menu. <Link to="/chef/menu">Back to menu</Link></div> :
          <article className="chef-food-detail-card">
            {selectedFood.image_url ? <img className="chef-food-detail-image" src={selectedFood.image_url} alt={selectedFood.name} /> : <div className="chef-food-detail-image chef-food-detail-placeholder"><Utensils size={38} /></div>}
            <div className="chef-food-detail-content">
              <div className="chef-food-detail-meta"><span>{selectedFood.category_name}</span><strong className={selectedFood.is_available ? "available" : "unavailable"}>{selectedFood.is_available ? "Available" : "Unavailable"}</strong></div>
              <h3>{selectedFood.name}</h3>
              <p className="chef-food-detail-description">{selectedFood.description || "No description has been added for this dish."}</p>
              <section className="chef-food-variants"><h4>Options and prices</h4>{selectedFood.variants?.length ? <ul>{selectedFood.variants.map((variant) => <li key={variant.id}><span>{variant.name}<small>{variant.is_available ? "Available" : "Unavailable"}</small></span><strong>₹{Number(variant.price).toFixed(2)}</strong></li>)}</ul> : <p>No options are listed for this dish.</p>}</section>
            </div>
          </article>
      ) : <>
        <div className="chef-menu-listing-controls"><label><Search size={17} /><input type="search" placeholder="Search food items" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search food items" /></label><select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="ALL">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        {visibleCategories.length ? visibleCategories.map((category) => <section className="chef-menu-list-category" key={category.id}><h3>{category.name}<span>{category.foods.length}</span></h3><div className="chef-menu-list-grid">{category.foods.map((food) => <Link className="chef-menu-list-card" key={food.id} to={`/chef/menu/${food.id}`}>
          {food.image_url ? <img src={food.image_url} alt="" loading="lazy" /> : <span className="chef-menu-list-placeholder"><Utensils size={24} /></span>}
          <span className="chef-menu-list-card-content"><span className="chef-menu-list-card-title"><strong>{food.name}</strong><i className={food.is_available ? "available" : "unavailable"}>{food.is_available ? "Available" : "Unavailable"}</i></span><span className="chef-menu-list-description">{food.description || "View item details and options."}</span><span className="chef-menu-list-price">{food.variants?.length ? `From ₹${Math.min(...food.variants.map((variant) => Number(variant.price))).toFixed(2)}` : "No price options"}</span></span>
        </Link>)}</div></section>) : <div className="chef-menu-page-message">{foods.length ? "No food items match your search." : "No food items have been added to the menu yet."}</div>}
      </>}
    </main>
  </ChefLayout>;
}
