# SatsAcademy deployment

Repository: https://github.com/greyw0rks/satsacademy

Public site: https://satsacademy.vercel.app/

The standalone Vercel project serves SatsAcademy at its root. Its build includes only apps/satsacademy; no Finance or other product interface is bundled. The reviewed Convex infrastructure remains shared, with this product's existing isolated tables and wallet scope. Register this site in GREY_ALLOWED_ORIGINS before authenticated use. The public API rewrites to intent-curlew-185.convex.site. Historical evidence keeps its original origins and hashes. New release checks document this standalone snapshot.

Run pnpm build:release to build dist/. Run ./start.sh for the private local lab.
