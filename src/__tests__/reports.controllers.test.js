const { calculateMtbf, calculateMttr } = require('../controllers/reports.controllers');

describe('reports.controllers helpers', () => {
    test('calculateMtbf returns insufficient when fewer than 2 incidents', () => {
        const res = calculateMtbf([{ reported_date: '2024-01-01' }]);
        expect(res.status).toBe('insufficient_data');
        expect(res.value).toBeNull();
    });

    test('calculateMtbf computes average diff in hours', () => {
        const res = calculateMtbf([
            { reported_date: '2024-01-01T00:00:00Z' },
            { reported_date: '2024-01-02T00:00:00Z' },
            { reported_date: '2024-01-03T00:00:00Z' }
        ]);
        expect(res.status).toBe('ok');
        expect(res.value).toBeCloseTo(24, 2);
    });

    test('calculateMtbf falls back to createdAt when reported_date missing', () => {
        const res = calculateMtbf([
            { createdAt: '2024-01-01T00:00:00Z' },
            { reported_date: '2024-01-02T00:00:00Z' }
        ]);
        expect(res.status).toBe('ok');
        expect(res.value).toBeCloseTo(24, 2);
    });

    test('calculateMttr prefers downtime_hours and falls back to maintenance duration', () => {
        const incidents = [
            { downtime_hours: 2 },
            { downtime_hours: null, maintenance_id: 10 }
        ];
        const maintenanceMap = { 10: { actual_duration: 4 } };
        const res = calculateMttr(incidents, maintenanceMap);
        expect(res.status).toBe('ok');
        expect(res.value).toBeCloseTo(3, 2);
    });

    test('calculateMttr returns insufficient when no durations', () => {
        const res = calculateMttr([{ downtime_hours: null }], {});
        expect(res.status).toBe('insufficient_data');
        expect(res.value).toBeNull();
    });
});
