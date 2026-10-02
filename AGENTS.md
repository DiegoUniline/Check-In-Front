# Architecture rules

- Paginate operational collection reads beyond the backend's 1,000-row response limit, because calendar and date-filter views require complete hotel datasets.