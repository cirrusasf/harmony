const { describe, it } = require('mocha');
const { expect } = require('chai');
const Job = require('../../app/models/job');
const stacItem = require('../../app/frontends/stac-item');

// Prop for testing
const jobProps = {
  jobID: '1234',
  request: 'example.com',
  createdAt: '2020-02-02T00:00:00Z',
  links: [
    {
      href: 'file_1.nc',
      title: 'Item #1',
      type: 'application/nc',
      bbox: [-80, -30, -100, 20],
      temporal: {
        start: '1996-10-15T00:05:32.000Z',
        end: '1996-11-15T00:05:32.000Z',
      },
    },
    {
      href: 'file_2.png',
      title: 'Item #2',
      type: 'image/png',
      bbox: [-100, -30, -80, 20],
      temporal: {
        start: '1996-10-15T00:05:32.000Z',
        end: '1996-11-15T00:05:32.000Z',
      },
    },
  ],
};
const job = new Job(jobProps);

describe('stac-item', function () {
  describe('STAC Item creation with invalid argument', function () {
    const obj = { jobID: 1 };
    it('should fail', function (done) {
      expect(function () { stacItem.create(obj); }).to.throw();
      done();
    });
  });

  describe('STAC Item creation with an object matching Harmony Job properties', function () {
    it('should fail', function (done) {
      expect(function () { stacItem.create(jobProps); }).to.throw();
      done();
    });
  });

  describe('STAC Item creation with a Harmony Job object: case of anti-meridian crossing', function () {
    let jsonObj = {};
    it('created Harmony STAC Item', function (done) {
      expect(function () { jsonObj = stacItem.create(job, 0); }).to.not.throw();
      done();
    });
    it('Item ID matches Job ID', function (done) {
      expect(jsonObj.id).to.equal(jobProps.jobID);
      done();
    });
    it('has a bounding box that crosses anti-meridian', function (done) {
      expect(jsonObj.geometry.type).to.equal('MultiPolygon');
      done();
    });
    // TODO: validate GeoJSON geometry
    it('has the creation time', function (done) {
      expect(jsonObj.properties.created).to.equal('2020-02-02T00:00:00Z');
      done();
    });
    it('has the representative date time', function (done) {
      expect(jsonObj.properties.datetime).to.equal('1996-10-15T00:05:32.000Z');
      done();
    });
    it('has self-referencing links', function (done) {
      expect(jsonObj.links.length).to.equal(2);
      done();
    });
    it('has roles for the asset', function (done) {
      expect(jsonObj.assets['file_1.nc'].roles[0]).to.equal('data');
      done();
    });
  });

  describe('STAC Item creation with a Harmony Job object: case without anti-meridian crossing', function () {
    let jsonObj = {};
    it('created Harmony STAC Item', function (done) {
      expect(function () { jsonObj = stacItem.create(job, 1); }).to.not.throw();
      done();
    });
    it('has a bounding box that doesn\'t anti-meridian', function (done) {
      expect(jsonObj.geometry.type).to.equal('Polygon');
      done();
    });
    it('has roles for the asset', function (done) {
      expect(jsonObj.assets['file_2.png'].roles[0]).to.equal('overview');
      done();
    });
  });
});
