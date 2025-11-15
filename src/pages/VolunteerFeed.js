import './VolunteerFeed.css';

import {importLibrary, setOptions} from '@googlemaps/js-api-loader';
import {addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where} from 'firebase/firestore';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {prioritizeTasks} from '../config/claude';
import {db} from '../config/firebase';
import {useAuth} from '../contexts/AuthContext';

const VolunteerFeed = () => {
  const navigate = useNavigate();
  const {currentUser} = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [sortOption, setSortOption] = useState('newest');
  const [geocodeCache, setGeocodeCache] = useState({});

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation({lat: 0, lng: 0});
      return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation(
              {lat: position.coords.latitude, lng: position.coords.longitude});
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation({lat: 0, lng: 0});
        });
  }, []);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;  // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const loadRequests = useCallback(async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      let querySnapshot;
      try {
        const q = query(
            collection(db, 'requests'), where('status', '==', 'open'),
            orderBy('createdAt', 'desc'), limit(50));
        querySnapshot = await getDocs(q);
      } catch (error) {
        console.warn('Volunteer feed orderBy fallback:', error);
        const q = query(
            collection(db, 'requests'), where('status', '==', 'open'),
            limit(50));
        querySnapshot = await getDocs(q);
      }

      let requestsData = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const distance = userLocation && data.location ?
            calculateDistance(
                userLocation.lat, userLocation.lng, data.location.lat,
                data.location.lng) :
            null;
        return {id: docSnap.id, ...data, distance};
      });

      requestsData = await prioritizeTasks(requestsData);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSelectRequest = useCallback((request) => {
    setSelectedRequestId(request.id);
    if (mapRef.current && request.location?.lat && request.location?.lng) {
      mapRef.current.panTo(
          {lat: request.location.lat, lng: request.location.lng});
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom(), 13));
    }
  }, []);

  const handleRespond = async (requestId, request) => {
    if (!currentUser) return;

    const message = prompt('Add a message to your response (optional):');
    if (message === null) return;

    try {
      const responseData = {
        requestId,
        volunteerId: currentUser.uid,
        status: 'pending',
        message: message || '',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'responses'), responseData);

      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, {
        status:
            request.volunteersNeeded &&
                ((Array.isArray(request.assignedVolunteers) ?
                      request.assignedVolunteers.length :
                      request.assignedTo ? 1 : 0) +
             1) >= request.volunteersNeeded ?
            'assigned' :
            'open',
        assignedTo: currentUser.uid,
        assignedVolunteers: Array.isArray(request.assignedVolunteers) ?
            [...request.assignedVolunteers, currentUser.uid] :
            request.assignedTo ?
            [request.assignedTo, currentUser.uid] :
            [currentUser.uid],
        updatedAt: serverTimestamp()
      });

      await loadRequests();
      alert('Response submitted successfully!');
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('Failed to submit response. Please try again.');
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || !userLocation || !GOOGLE_MAPS_API_KEY)
      return;

    let isMounted = true;

    const initMap = async () => {
      try {
        setOptions({apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly'});

        const {Map} = await importLibrary('maps');
        if (!isMounted || !mapContainerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new Map(mapContainerRef.current, {
            center: userLocation,
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });
        } else {
          mapRef.current.setCenter(userLocation);
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapError('Unable to load map. Check your Google Maps API key.');
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [userLocation, GOOGLE_MAPS_API_KEY]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const google = window.google;
    const bounds = new google.maps.LatLngBounds();

    if (userLocation) {
      const volunteerMarker = new google.maps.Marker({
        position: userLocation,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4CAF50',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        title: 'Your location'
      });
      markersRef.current.push(volunteerMarker);
      bounds.extend(userLocation);
    }

    requests.forEach((request) => {
      if (!request.location?.lat || !request.location?.lng) return;

      const marker = new google.maps.Marker({
        position: {lat: request.location.lat, lng: request.location.lng},
        map: mapRef.current,
        title: request.title,
        icon: {
          url: selectedRequestId === request.id ?
              'http://maps.google.com/mapfiles/ms/icons/red-dot.png' :
              'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
        }
      });

      marker.addListener('click', () => handleSelectRequest(request));
      markersRef.current.push(marker);
      bounds.extend({lat: request.location.lat, lng: request.location.lng});
    });

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 60);
    }
  }, [requests, userLocation, handleSelectRequest, selectedRequestId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(
        undefined, {month: 'short', day: 'numeric', year: 'numeric'});
  };

  const renderVolunteerCount = (request) => {
    const volunteersNeeded = request.volunteersNeeded || 1;
    const assignedCount = Array.isArray(request.assignedVolunteers) ?
        request.assignedVolunteers.length :
        request.assignedTo ? 1 :
                             0;
    return `${assignedCount}/${volunteersNeeded}`;
  };

  const formatRequestLocation = (request) => {
    const {location} = request;
    if (location?.address) {
      return location.address;
    }

    if (geocodeCache[request.id]) {
      return geocodeCache[request.id];
    }

    if (!location) {
      return request.distance != null ?
          `${request.distance.toFixed(1)} km away` :
          'Location not provided';
    }

    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    }

    if (location.city) {
      return location.city;
    }

    if (location.address) {
      return location.address;
    }

    return request.distance != null ? `${request.distance.toFixed(1)} km away` :
                                      'Location not provided';
  };

  const getDirectionsLink = (request) => {
    if (!userLocation || !request.location?.lat || !request.location?.lng) {
      return null;
    }

    const origin = `${userLocation.lat},${userLocation.lng}`;
    const destination = `${request.location.lat},${request.location.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${
        encodeURIComponent(
            origin)}&destination=${encodeURIComponent(destination)}`;
  };

  const filteredRequests = [...requests].sort((a, b) => {
            if (sortOption === 'closest') {
              return (a.distance || Infinity) - (b.distance || Infinity);
            }
            if (sortOption === 'urgency') {
              const order = {emergency: 3, high: 2, medium: 1, low: 0};
              return (order[b.urgencyLevel] || 0) -
                  (order[a.urgencyLevel] || 0);
            }
            // newest
            const aDate = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bDate = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bDate - aDate;
          });

  const handleZoom = (direction) => {
    if (!mapRef.current) return;
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.setZoom(
        direction === 'in' ? currentZoom + 1 : currentZoom - 1);
  };

  const handleDrawBoundary = () => {
    alert('Draw service area coming soon!');
  };

  const handleFilterClick = () => {
    alert('Advanced filters coming soon!');
  };

  const taskCountLabel = filteredRequests.length === 1 ?
      '1 task available' :
      `${filteredRequests.length} tasks available`;

  const fetchFormattedAddress = async (lat, lng) => {
    if (!GOOGLE_MAPS_API_KEY || lat == null || lng == null) return null;
    try {
      const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${
              lng}&key=${GOOGLE_MAPS_API_KEY}`);
      if (!response.ok) {
        throw new Error('Failed to reverse geocode location');
      }
      const data = await response.json();
      return data.results?.[0]?.formatted_address || null;
    } catch (error) {
      console.error('Volunteer feed reverse geocode error:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    const requestsToGeocode = requests.filter(
        (request) => request.location && !request.location.address &&
            request.location.lat != null && request.location.lng != null &&
            !geocodeCache[request.id]);

    if (requestsToGeocode.length === 0) return;

    let isMounted = true;

    const loadAddresses = async () => {
      const updates = {};
      for (const request of requestsToGeocode) {
        const formatted = await fetchFormattedAddress(
            request.location.lat, request.location.lng);
        if (formatted) {
          updates[request.id] = formatted;
        }
      }
      if (isMounted && Object.keys(updates).length) {
        setGeocodeCache((prev) => ({...prev, ...updates}));
      }
    };

    loadAddresses();

    return () => {
      isMounted = false;
    };
  }, [requests, geocodeCache, GOOGLE_MAPS_API_KEY]);

  return (
    <div className='volunteer-feed-page'>
      <header className='top-nav'>
        <div className='nav-left'>
          <button className='icon-btn' onClick={() => navigate('/dashboard')}>
            ☰
          </button>
        </div>
        <div className='nav-center' />
        <div className='nav-right'>
          <select
  className = 'sort-select'
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value='newest'>Sort: Newest</option>
            <option value='closest'>Sort: Closest</option>
            <option value='urgency'>Sort: Highest Urgency</option>
          </select>
          <button className='secondary-btn' onClick={() => navigate('/profile')}>
            Profile
          </button>
        </div>
      </header>

      <main className="volunteer-feed-container">
        <div className="volunteer-feed-content">
          <div className="map-panel card">
            {!GOOGLE_MAPS_API_KEY ? (
              <div className="map-placeholder">
                <p>Google Maps API key not configured.</p>
                <p>
                  Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to your .env file.
                </p>
              </div>
            ) : mapError ? (
              <div className="map-placeholder error">
                <p>{mapError}</p>
              </div>
            ) : (
              <>
                <div ref={mapContainerRef} className="map-container" />
                <div className='map-controls'>
                  <div className='map-controls-left'>
                    <button className='map-control-btn' onClick={handleFilterClick}>
                      ⚙️
                    </button>
                    <button className="map-control-btn" onClick={handleDrawBoundary}>
                      📐
                    </button>
                    <button className='map-control-btn' onClick={loadRequests}>
                      🔄
                    </button>
                  </div>
                  <div className='map-zoom-controls'>
                    <button className='map-control-btn' onClick={() => handleZoom('in')}>
                      +
                    </button>
                    <button className="map-control-btn" onClick={() => handleZoom('out')}>
                      −
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className='requests-panel'>
            <div className='requests-panel-header'>
              <div>
                <h2>Volunteer Opportunities</h2>
                <p>{taskCountLabel}</p>
              </div>
              <button className="secondary-btn" onClick={loadRequests}>
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="loading">Loading nearby requests...</div>
            ) : filteredRequests.length === 0 ? (
              <div className='empty-state card'>
                <h3>No requests available</h3>
                <p>There are no open help requests in your area at the moment.</p>
              </div>
            ) : (
              <div className="requests-list">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`request-item card ${
                      selectedRequestId === request.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectRequest(request)}
                  >
                    <div className="request-card-header">
                      <div>
                        <h3>{request.title}</h3>
                        <p className='muted-text'>{formatRequestLocation(request)}</p>
                      </div>
                      <button className='icon-btn small' aria-label='Save task'>
                        ♡
                      </button>
                    </div>
                    <div className='badges-row'>
                      <span className={`urgency-badge urgency-${request.urgencyLevel}`}>
                        {request.urgencyLevel}
                      </span>
                      {request.category && (
                        <span className="chip chip-muted">{request.category}</span>
                      )
} {request.distance !== null && (
                        <span className='chip chip-distance'>
                          {request.distance.toFixed(1)} km away
                        </span>
                      )}
                    </div>
                    {request.photos && request.photos.length > 0 && (
                      <div className='request-image'>
                        <img src={request.photos[0]} alt={
    request.title} />
                      </div>
                    )}
                    <p className='request-description'>
                      {request.description || 'No description provided.'}
                    </p>
                    <div className="request-meta">
                      <div className="meta-item people-indicator">
                        <span role="img" aria-label="volunteers">👥</span>{' '}
                        {renderVolunteerCount(request)}
                      </div>
                      <div className="meta-item">
                        <strong>Created:</strong> {formatDate(request.createdAt)}
                      </div>
                      <div className="meta-item">
                        <strong>Location:</strong> {formatRequestLocation(request)}
                      </div>
                      <div className="meta-item">
                        <strong>Directions:</strong>{' '}
                        {
    getDirectionsLink(request) ? (< a
    href = {getDirectionsLink(request)} target = '_blank'
    rel = 'noopener noreferrer'
    className = 'directions-link'
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open in Google Maps
                          </a>
                        ) : (
                          'Not available'
                        )}
                      </div>
                    </div>
                    <div className='request-features'>
                      {request.safetyNotes && (
                        <span className='chip chip-warning'>Safety: {request.safetyNotes}</span>
                      )}
                      {request.estimatedTime && (
                        <span className='chip chip-muted'>
                          Est. time: {request.estimatedTime}
                        </span>
                      )}
                    </div>
                    <div className='request-actions'>
                      <button className='secondary-btn small'>View Details</button>
                      <button
                        className='primary-btn'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRespond(request.id, request);
                        }}
                        disabled={request.status !== 'open'}
                      >
                        {request.status === 'open' ? 'Accept Task' : 'Already Assigned'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
                        }
                        ;

                        export default VolunteerFeed;
