import test from 'basictap';
import createControllerStore from '../../../lib/modules/controllers/createControllerStore.js';

test('createControllerStore: no applicable controller test', t => {
  t.pass();

  const controllerStore = createControllerStore();

  controllerStore.add({
    command: 2,
    conditions: [],
    handler: request => console.log()
  });

  controllerStore.add({
    command: 1,
    conditions: [],
    handler: request => console.log()
  });

  const controllers = controllerStore.find({
    command: 3,
    json: () => ({
      test: 2
    })
  });

  t.ok(controllers.length === 0, 'has 0 controllers');
});

test('createControllerStore: one applicable controller test', t => {
  t.pass();

  const controllerStore = createControllerStore();

  controllerStore.add({
    command: 2,
    conditions: [],
    handler: request => console.log()
  });

  controllerStore.add({
    command: 1,
    conditions: [],
    handler: request => console.log()
  });

  const controllers = controllerStore.find({
    command: 1,
    json: () => ({
      test: 2
    })
  });

  t.ok(controllers.length === 1, 'has 1 controller');
});

test('createControllerStore: multiple controller test with condition', t => {
  t.pass();

  const controllerStore = createControllerStore();

  controllerStore.add({
    command: 1,
    conditions: [],
    handler: () => 10
  });

  controllerStore.add({
    command: 1,
    conditions: [() => false],
    handler: () => 20
  });

  const controllers = controllerStore.find({
    command: 1,
    json: () => ({
      test: 2
    })
  });

  t.ok(controllers.length === 1, 'has 1 controller');
  t.equal(controllers[0].handler(), 10, 'handler returned correctly');
});
