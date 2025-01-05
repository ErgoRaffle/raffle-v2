import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: {
      all: true,
      provider: 'istanbul',
      reporter: 'cobertura',
    },
    passWithNoTests: true,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidml0ZXN0LmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZpdGVzdC5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUU3QyxlQUFlLFlBQVksQ0FBQztJQUMxQixJQUFJLEVBQUU7UUFDSixRQUFRLEVBQUU7WUFDUixHQUFHLEVBQUUsSUFBSTtZQUNULFFBQVEsRUFBRSxVQUFVO1lBQ3BCLFFBQVEsRUFBRSxXQUFXO1NBQ3RCO1FBQ0QsZUFBZSxFQUFFLElBQUk7UUFDckIsV0FBVyxFQUFFO1lBQ1gsT0FBTyxFQUFFO2dCQUNQLFlBQVksRUFBRSxJQUFJO2FBQ25CO1NBQ0Y7S0FDRjtDQUNGLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICB0ZXN0OiB7XG4gICAgY292ZXJhZ2U6IHtcbiAgICAgIGFsbDogdHJ1ZSxcbiAgICAgIHByb3ZpZGVyOiAnaXN0YW5idWwnLFxuICAgICAgcmVwb3J0ZXI6ICdjb2JlcnR1cmEnLFxuICAgIH0sXG4gICAgcGFzc1dpdGhOb1Rlc3RzOiB0cnVlLFxuICAgIHBvb2xPcHRpb25zOiB7XG4gICAgICB0aHJlYWRzOiB7XG4gICAgICAgIHNpbmdsZVRocmVhZDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl19
