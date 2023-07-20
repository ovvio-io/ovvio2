/* eslint-disable */
import React, {
	useContext,
	useState,
	useEffect,
} from 'react';

class Observable {
	constructor() {
		this._listeners = [];
		this._dependentModels = new Set();
	}

	listen(listenerFn) {
		this._listeners.push(listenerFn);
		this.listenersDidChange();
		return () => {
			this.removeListener(listenerFn);
		};
	}

	removeListener(listenerFn) {
		this._listeners.splice(
			this._listeners.indexOf(listenerFn),
			1
		);
	}

	notifyListeners(propName) {
		this._listeners.forEach(fn => fn(this, propName));
		this._dependentModels.forEach(model =>
			model.notifyListeners()
		);
	}

	hasListeners() {
		return this._listeners.length > 0;
	}

	listenersDidChange() {}

	// addDependentModel(model) {
	// 	this._dependentModels.add(model);
	// 	return () => {
	// 		this._dependentModels.delete(model);
	// 	};
	// }

	// removeDependentModel(model) {
	// 	this._dependentModels.delete(model);
	// }
}

class Store extends Observable {
	constructor() {
		super();
		this._isReady = false;
	}

	get isReady() {
		return this._isReady;
	}

	set isReady(value) {
		if (value !== this._isReady) {
			this._isReady = value;
			this.notifyListeners('isReady');
		}
	}

	onInitialize() {
		return Promise.resolve();
	}

	initialize() {
		return this.onInitialize().then(
			() => (this.isReady = true)
		);
	}
}

const createProvider = (
	ObservableClass,
	{ dependencies = [], name } = {}
) => {
	name = name || ObservableClass.name;

	if (ObservableClass.$$ProviderComponent) {
		return ObservableClass.$$ProviderComponent;
	}

	const ctx = React.createContext(null);
	ObservableClass.$$context = ctx;
	const defaultFactory = args =>
		new ObservableClass(...args);
	const StoreProvider = ({
		children,
		createStore = defaultFactory,
		...rest
	}) => {
		const deps = dependencies.map(useScopedObservable);
		const [store, setStore] = useState(null);
		let value = undefined;
		if (rest.hasOwnProperty('value')) {
			value = rest.value;
			delete rest.value;
			value = value || null;
		}

		const restSpread = Object.keys(rest).reduce(
			(arr, k) => {
				arr.push(k);
				arr.push(rest[k]);
				return arr;
			},
			[]
		);

		useEffect(
			() => {
				if (typeof value !== 'undefined') {
					setStore(value);
					return;
				}
				if (
					deps.every(x => x && (x.isReady || !x.initialize))
				) {
					const newStore = createStore(deps.concat(rest));
					setStore(newStore);
				} else {
					setStore(null);
				}
			},
			deps.reduce(
				(accum, store) => {
					accum.push(store);
					accum.push(!!store && store.isReady);
					return accum;
				},
				[value, ...restSpread]
			)
		);

		useEffect(() => {
			if (store && store.initialize) {
				store.initialize();
				return () => {
					if (store.release) {
						store.release();
					}
				};
			}
		}, [store]);

		return (
			<ObservableClass.$$context.Provider value={store}>
				{children}
			</ObservableClass.$$context.Provider>
		);
	};

	StoreProvider.displayName = name;
	StoreProvider.Provider = StoreProvider;
	StoreProvider.hook = function useStore() {
		return useScopedObservable(ObservableClass);
	};
	return StoreProvider;
};

const useScopedObservable = (ObservableClass, opts) => {
	const store = useContext(ObservableClass.$$context);
	return useObservable(store, opts);
};

const useObservable = (
	observable,
	{ includeVersion = false, dependantProperties } = {}
) => {
	const [version, setVersion] = useState(0);

	useEffect(() => {
		let done = false;
		let unsub = () => {};
		if (observable) {
			unsub = observable.listen((_, propName) => {
				if (done) {
					return;
				}
				if (
					!dependantProperties ||
					!propName ||
					dependantProperties.includes(propName)
				) {
					setVersion(x => x + 1);
				}
			});
		}

		return () => {
			done = true;
			unsub();
		};
	}, [observable, dependantProperties]);
	if (includeVersion) {
		return [observable, version];
	}
	return observable;
};

const observeScoped = (
	ObservableClass,
	Component,
	name,
	dependantProperties
) => {
	const ScopedComponent = props => {
		const [observable, version] = useScopedObservable(
			ObservableClass,
			{
				includeVersion: true,
				dependantProperties,
			}
		);
		const values = {
			[name]: observable,
		};

		return (
			<Component
				{...props}
				{...values}
				$$version={version}
			/>
		);
	};

	return ScopedComponent;
};

const observe = (
	Component,
	propName,
	dependantProperties
) => {
	const ObservingComponent = props => {
		const [observable, version] = useObservable(
			props[propName],
			{
				includeVersion: true,
				dependantProperties,
			}
		);

		const newProps = {
			...props,
			[propName]: observable,
			[`$$${propName}Version`]: version,
		};

		return <Component {...newProps} />;
	};

	return ObservingComponent;
};

export {
	Observable,
	Store,
	createProvider,
	useScopedObservable,
	useObservable,
	observeScoped,
	observe,
};
