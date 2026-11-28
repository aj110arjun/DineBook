# Floors, zones and tables

Managers can create a floor with optional named zones, entered one per line. Existing floors can be divided later using **Add Zone** in the floor map. Zone names can be edited, and empty zones can be deleted. Names are unique within each floor, ignoring letter case.

The table form has separate **Floor** and **Zone** selectors. Zone choices belong to the selected floor. **General seating** leaves a table unassigned; existing tables remain in general seating. Changing the selected floor clears the previous zone. Floor maps group tables by zone and support zone filtering and searching.

Zones appear in floor/table read APIs and in reservation table choices. Booking capacity, pricing, availability and floor coordinates retain their existing rules. The database enforces that a table's zone belongs to its floor. Tables must be moved before their zone can be deleted.

Backend migration: `venv/bin/alembic upgrade head` (`0056_floor_zones`). It adds a zone table and a nullable table-zone assignment without changing existing tables or reservations.

Checks: backend `venv/bin/python -m unittest tests.test_floor_zones tests.test_table_floor_layout tests.test_manager_dashboard -q`; frontend `node --test src/lib/floorZones.render.test.js src/lib/tableFloorLayout.test.js` and `npm run build`.
