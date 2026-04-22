// test/unit/utils/geo-helper.test.js

jest.mock('geoip-lite', () => ({
    lookup: jest.fn(),
}));

const geoip = require('geoip-lite');
const { getLocationPattern } = require('../../../dist/utils/geo-helper');

describe('geo-helper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return location pattern for valid IP', () => {
        geoip.lookup.mockReturnValue({
            country: 'US',
            area: '05',
            city: 'New York',
            range: [1234567890, 1234567999],
        });

        const result = getLocationPattern('8.8.8.8');

        expect(result).toContain('US');
        expect(geoip.lookup).toHaveBeenCalledWith('8.8.8.8');
    });

    it('should return Unknown for invalid IP', () => {
        geoip.lookup.mockReturnValue(null);

        const result = getLocationPattern('invalid-ip');

        expect(result).toBe('Unknown');
    });

    it('should return Unknown for empty IP', () => {
        geoip.lookup.mockReturnValue(null);

        const result = getLocationPattern(undefined);

        expect(result).toBe('Unknown');
    });

    it('should format location pattern correctly', () => {
        geoip.lookup.mockReturnValue({
            country: 'CR',
            area: 11,
            city: 'San Jose',
            range: [3232235777, 3232236031],
        });

        const result = getLocationPattern('192.168.1.1');

        expect(result).toMatch(/CR-\d+-San Jose/);
    });
});
