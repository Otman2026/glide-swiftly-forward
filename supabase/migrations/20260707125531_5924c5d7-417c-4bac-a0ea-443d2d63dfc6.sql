
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON public.warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trips_tenant ON public.trips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_tenant ON public.warehouse_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant ON public.inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_violations_tenant ON public.violations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trip_locations_tenant ON public.trip_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON public.attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leaves_tenant ON public.leaves(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON public.payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_tenant ON public.fuel_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_tenant ON public.maintenance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON public.incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON public.stock_movements(tenant_id);

CREATE INDEX IF NOT EXISTS idx_trips_tenant_created ON public.trips(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON public.expenses(tenant_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_tenant_date ON public.fuel_logs(tenant_id, fuel_date DESC);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_system_owner(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_customer(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_driver(uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_system_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_driver(uuid) TO authenticated;
