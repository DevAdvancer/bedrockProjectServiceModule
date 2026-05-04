# Deal Service Dashboard

A Next.js dashboard for searching Freshsales deals, managing multiple linked service records in MongoDB, creating one Freshsales CPQ product per service, and attaching those products back to the selected deal.

## Environment

Create a `.env.local` file with:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/bedrock
FRESHSALES_BASE_URL=https://YOUR_DOMAIN.myfreshworks.com
FRESHSALES_API_KEY=your_freshsales_api_key
```

## Run locally

```bash
npm install
npm run dev
```

## Notes

- MongoDB data is stored in the `deal_services` collection.
- Each service is stored as an individual document with a UUID `id`.
- Freshsales deal search uses `GET /crmsales/api/search?q=...&include=deal`.
- Freshsales product creation uses `POST /crmsales/api/cpq/products`.
- Freshsales product updates use `PUT /crmsales/api/cpq/products/{product_id}`.
- Freshsales product pricing is synced with `PUT /crmsales/api/cpq/products/{product_id}?include=product_pricings`.
- Freshsales deal-product sync uses `PUT /crmsales/api/deals/{deal_id}?include=products`.
- Every service row stores its own `price`, syncs a USD product price, and then attaches to the deal as a product line item with `quantity: 1`.
- The selected Freshsales deal must also be in USD, or Freshsales will reject the product attachment.

## Freshsales Product Custom Fields

Create these custom fields on the Freshsales Product form:

- `cf_service_category`
- `cf_service_sub_category`
- `cf_universal_platform`
- `cf_base_service_name`
- `cf_flavors`
- `cf_service_specific_enhancements`
- `cf_aui`
- `cf_updated_main_machine`
- `cf_updated_machine_2`
- `cf_updated_machine_3`
- `cf_final_value`

The exact field mapping constants live in `lib/freshsales-product-fields.ts`.
